"""Модуль работы с выдачей и бронированием книг"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, col, func
from sqlalchemy import cast, Date

from library_service.auth import RequireAuth, RequireStaff, RequireAdmin, is_user_staff
from library_service.settings import get_session
from library_service.models.db import Book, User, BookUserLink
from library_service.models.dto import LoanCreate, LoanRead, LoanList, LoanUpdate
from library_service.models.enums import BookStatus


router = APIRouter(prefix="/loans", tags=["loans"])


@router.post(
    "/",
    response_model=LoanRead,
    summary="Создать выдачу/бронь",
    description="Создает запись о выдаче или бронировании книги",
)
def create_loan(
    current_user: RequireAuth,
    loan: LoanCreate,
    session: Session = Depends(get_session),
):
    """Создает выдачу или бронирование книги"""
    is_staff = is_user_staff(current_user)

    if not is_staff and loan.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create loans for yourself",
        )

    book = session.get(Book, loan.book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if book.status != BookStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book is not available for loan (status: {book.status})",
        )

    target_user = session.get(User, loan.user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    db_loan = BookUserLink(
        book_id=loan.book_id,
        user_id=loan.user_id,
        due_date=loan.due_date,
        borrowed_at=datetime.now(timezone.utc),
    )

    book.status = BookStatus.RESERVED

    session.add(db_loan)
    session.add(book)
    session.commit()
    session.refresh(db_loan)

    return LoanRead(**db_loan.model_dump())


@router.get(
    "/",
    response_model=LoanList,
    summary="Получить список выдач",
    description="Возвращает список выдач. Читатели видят только свои. Сотрудники видят все.",
)
def read_loans(
    current_user: RequireAuth,
    session: Session = Depends(get_session),
    user_id: int | None = Query(None, description="Фильтр по user_ID"),
    book_id: int | None = Query(None, description="Фильтр по book_ID"),
    active_only: bool = Query(False, description="Только не возвращенные выдачи"),
    page: int = Query(1, gt=0, description="Номер страницы"),
    size: int = Query(20, gt=0, lt=101, description="Элементов на странице"),
):
    """Возвращает список выдач с фильтрацией и пагинацией"""
    is_staff = is_user_staff(current_user)

    statement = select(BookUserLink)

    if not is_staff:
        statement = statement.where(BookUserLink.user_id == current_user.id)
    elif user_id is not None:
        statement = statement.where(BookUserLink.user_id == user_id)

    if book_id is not None:
        statement = statement.where(BookUserLink.book_id == book_id)

    if active_only:
        statement = statement.where(BookUserLink.returned_at == None)  # noqa: E711

    total_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(total_statement).one()

    offset = (page - 1) * size
    statement = statement.order_by(col(BookUserLink.borrowed_at).desc())
    statement = statement.offset(offset).limit(size)

    loans = session.exec(statement).all()

    return LoanList(
        loans=[LoanRead(**loan.model_dump()) for loan in loans], total=total
    )


@router.get(
    "/analytics",
    summary="Аналитика выдач и возвратов",
    description="Возвращает аналитику выдач и возвратов. Только для админов.",
)
def get_loans_analytics(
    current_user: RequireAdmin,
    days: int = Query(30, ge=1, le=365, description="Количество дней для анализа"),
    session: Session = Depends(get_session),
):
    """Возвращает аналитику по выдачам и возвратам книг"""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    total_loans = session.exec(
        select(func.count(BookUserLink.id)).where(
            BookUserLink.borrowed_at >= start_date
        )
    ).one()

    active_loans = session.exec(
        select(func.count(BookUserLink.id))
        .where(BookUserLink.borrowed_at >= start_date)
        .where(BookUserLink.returned_at == None)  # noqa: E711
    ).one()

    returned_loans = session.exec(
        select(func.count(BookUserLink.id))
        .where(BookUserLink.borrowed_at >= start_date)
        .where(BookUserLink.returned_at != None)  # noqa: E711
    ).one()

    overdue_loans = session.exec(
        select(func.count(BookUserLink.id))
        .where(BookUserLink.returned_at == None)  # noqa: E711
        .where(BookUserLink.due_date < end_date)
    ).one()

    daily_loans = {}
    daily_returns = {}

    loans_by_date = session.exec(
        select(
            cast(BookUserLink.borrowed_at, Date).label("date"),
            func.count(BookUserLink.id).label("count"),
        )
        .where(BookUserLink.borrowed_at >= start_date)
        .group_by(cast(BookUserLink.borrowed_at, Date))
        .order_by(cast(BookUserLink.borrowed_at, Date))
    ).all()

    returns_by_date = session.exec(
        select(
            cast(BookUserLink.returned_at, Date).label("date"),
            func.count(BookUserLink.id).label("count"),
        )
        .where(
            BookUserLink.returned_at >= start_date  # ty: ignore[unsupported-operator]
        )
        .where(BookUserLink.returned_at != None)  # noqa: E711
        .group_by(cast(BookUserLink.returned_at, Date))
        .order_by(cast(BookUserLink.returned_at, Date))
    ).all()

    for row in loans_by_date:
        date_str = str(row[0]) if isinstance(row, tuple) else str(row.date)
        count = row[1] if isinstance(row, tuple) else row.count
        daily_loans[date_str] = count

    for row in returns_by_date:
        date_str = str(row[0]) if isinstance(row, tuple) else str(row.date)
        count = row[1] if isinstance(row, tuple) else row.count
        daily_returns[date_str] = count

    top_books = session.exec(
        select(BookUserLink.book_id, func.count(BookUserLink.id).label("loan_count"))
        .where(BookUserLink.borrowed_at >= start_date)
        .group_by(BookUserLink.book_id)
        .order_by(func.count(BookUserLink.id).desc())
        .limit(10)
    ).all()

    top_books_data = []
    for row in top_books:
        book_id = row[0] if isinstance(row, tuple) else row.book_id
        loan_count = row[1] if isinstance(row, tuple) else row.loan_count
        book = session.get(Book, book_id)
        if book:
            top_books_data.append(
                {"book_id": book_id, "title": book.title, "loan_count": loan_count}
            )

    reserved_count = session.exec(
        select(func.count(Book.id)).where(Book.status == BookStatus.RESERVED)
    ).one()

    borrowed_count = session.exec(
        select(func.count(Book.id)).where(Book.status == BookStatus.BORROWED)
    ).one()

    return JSONResponse(
        content={
            "summary": {
                "total_loans": total_loans,
                "active_loans": active_loans,
                "returned_loans": returned_loans,
                "overdue_loans": overdue_loans,
                "reserved_books": reserved_count,
                "borrowed_books": borrowed_count,
            },
            "daily_loans": daily_loans,
            "daily_returns": daily_returns,
            "top_books": top_books_data,
            "period_days": days,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        }
    )


@router.get(
    "/{loan_id}",
    response_model=LoanRead,
    summary="Получить выдачу по ID",
    description="Возвращает выдачу по ID",
)
def get_loan(
    current_user: RequireAuth,
    loan_id: int = Path(..., description="Loan ID (integer, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Возвращает информацию о выдаче по ID"""
    loan = session.get(BookUserLink, loan_id)

    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found",
        )

    is_staff = is_user_staff(current_user)

    if not is_staff and loan.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this loan",
        )

    return LoanRead(**loan.model_dump())


@router.put(
    "/{loan_id}",
    response_model=LoanRead,
    summary="Обновить выдачу",
    description="Обновляет информацию о выдаче. Сотрудники могут обновлять любые, читатели только свои.",
)
def update_loan(
    current_user: RequireAuth,
    loan_update: LoanUpdate,
    loan_id: int = Path(..., description="Loan ID (integer, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Обновляет информацию о выдаче"""
    db_loan = session.get(BookUserLink, loan_id)
    if not db_loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found",
        )

    is_staff = is_user_staff(current_user)

    if not is_staff and db_loan.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own loans",
        )

    book = session.get(Book, db_loan.book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if loan_update.user_id is not None:
        if not is_staff:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only staff can change loan user",
            )
        new_user = session.get(User, loan_update.user_id)
        if not new_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        db_loan.user_id = loan_update.user_id

    if loan_update.due_date is not None:
        db_loan.due_date = loan_update.due_date

    if loan_update.returned_at is not None:
        if db_loan.returned_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loan is already returned",
            )
        db_loan.returned_at = loan_update.returned_at
        book.status = BookStatus.ACTIVE

    session.add(db_loan)
    session.add(book)
    session.commit()
    session.refresh(db_loan)

    return LoanRead(**db_loan.model_dump())


@router.post(
    "/{loan_id}/confirm",
    response_model=LoanRead,
    summary="Подтвердить бронь",
    description="Подтверждает бронирование и меняет статус книги на BORROWED",
)
def confirm_loan(
    current_user: RequireStaff,
    loan_id: int = Path(..., description="Loan ID (integer, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Подтверждает бронирование и меняет статус книги на BORROWED"""
    loan = session.get(BookUserLink, loan_id)
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found",
        )

    if loan.returned_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loan is already returned",
        )

    book = session.get(Book, loan.book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if book.status not in [BookStatus.RESERVED, BookStatus.ACTIVE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm loan for book with status: {book.status}",
        )

    book.status = BookStatus.BORROWED

    session.add(loan)
    session.add(book)
    session.commit()
    session.refresh(loan)

    return LoanRead(**loan.model_dump())


@router.post(
    "/{loan_id}/return",
    response_model=LoanRead,
    summary="Вернуть книгу",
    description="Возвращает книгу и закрывает выдачу",
)
def return_loan(
    current_user: RequireStaff,
    loan_id: int = Path(..., description="Loan ID (integer, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Возвращает книгу и закрывает выдачу"""
    loan = session.get(BookUserLink, loan_id)
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found",
        )

    if loan.returned_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loan is already returned",
        )

    loan.returned_at = datetime.now(timezone.utc)

    book = session.get(Book, loan.book_id)
    if book:
        book.status = BookStatus.ACTIVE
        session.add(book)

    session.add(loan)
    session.commit()
    session.refresh(loan)

    return LoanRead(**loan.model_dump())


@router.delete(
    "/{loan_id}",
    response_model=LoanRead,
    summary="Удалить выдачу/бронь",
    description="Удаляет выдачу/бронь. Работает только для статуса RESERVED.",
)
def delete_loan(
    current_user: RequireAuth,
    loan_id: int = Path(..., description="Loan ID (integer, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Удаляет выдачу или бронирование (только для RESERVED статуса)"""
    loan = session.get(BookUserLink, loan_id)
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found",
        )

    is_staff = is_user_staff(current_user)

    if not is_staff and loan.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own loans",
        )

    book = session.get(Book, loan.book_id)

    if book and book.status != BookStatus.RESERVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete reservations. Use update endpoint to return borrowed books",
        )

    loan_read = LoanRead(**loan.model_dump())
    session.delete(loan)

    if book:
        book.status = BookStatus.ACTIVE
        session.add(book)

    session.commit()

    return loan_read


@router.get(
    "/book/{book_id}/active",
    response_model=LoanRead | None,
    summary="Получить активную выдачу книги",
    description="Возвращает активную выдачу для указанной книги",
)
def get_active_loan_for_book(
    current_user: RequireStaff,
    book_id: int = Path(..., description="Book ID (integer, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Возвращает активную выдачу для указанной книги"""
    loan = session.exec(
        select(BookUserLink)
        .where(BookUserLink.book_id == book_id)
        .where(BookUserLink.returned_at == None)  # noqa: E711
    ).first()

    if not loan:
        return None

    return LoanRead(**loan.model_dump())


@router.post(
    "/issue",
    response_model=LoanRead,
    summary="Выдать книгу напрямую",
    description="Только для администраторов. Создает выдачу и устанавливает статус книги на BORROWED.",
)
def issue_book_directly(
    current_user: RequireAdmin,
    loan: LoanCreate,
    session: Session = Depends(get_session),
):
    """Выдает книгу напрямую без бронирования (только для администраторов)"""
    book = session.get(Book, loan.book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if book.status != BookStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book is not available (status: {book.status})",
        )

    target_user = session.get(User, loan.user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    db_loan = BookUserLink(
        book_id=loan.book_id,
        user_id=loan.user_id,
        due_date=loan.due_date,
        borrowed_at=datetime.now(timezone.utc),
    )

    book.status = BookStatus.BORROWED

    session.add(db_loan)
    session.add(book)
    session.commit()
    session.refresh(db_loan)

    return LoanRead(**db_loan.model_dump())
