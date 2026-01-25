"""Модуль генерации описания схемы БД"""

import inspect
from typing import List, Dict, Any, Set, Type, Tuple

from pydantic.fields import FieldInfo
from sqlalchemy.inspection import inspect as sa_inspect
from sqlmodel import SQLModel


class SchemaGenerator:
    """Сервис генерации json описания схемы БД"""

    def __init__(self, db_module, dto_module=None):
        self.db_models = self._get_classes(db_module, is_table=True)
        self.dto_models = (
            self._get_classes(dto_module, is_table=False) if dto_module else []
        )
        self.link_table_names = self._identify_link_tables()
        self.field_descriptions = self._collect_all_descriptions()
        self._table_to_model = {m.__tablename__: m for m in self.db_models}

    def _get_classes(
        self, module, is_table: bool | None = None
    ) -> List[Type[SQLModel]]:
        if module is None:
            return []

        classes = []
        for name, obj in inspect.getmembers(module):
            if (
                inspect.isclass(obj)
                and issubclass(obj, SQLModel)
                and obj is not SQLModel
            ):
                if is_table is True and hasattr(obj, "__table__"):
                    classes.append(obj)
                elif is_table is False and not hasattr(obj, "__table__"):
                    classes.append(obj)
        return classes

    def _normalize_model_name(self, name: str) -> str:
        suffixes = [
            "Create",
            "Read",
            "Update",
            "DTO",
            "Base",
            "List",
            "Detail",
            "Response",
            "Request",
        ]
        result = name
        for suffix in suffixes:
            if result.endswith(suffix) and len(result) > len(suffix):
                result = result[: -len(suffix)]
        return result

    def _get_field_descriptions_from_class(self, cls: Type) -> Dict[str, str]:
        descriptions = {}

        for parent in cls.__mro__:
            if parent is SQLModel or parent is object:
                continue

            fields = getattr(parent, "model_fields", {})
            for field_name, field_info in fields.items():
                if field_name in descriptions:
                    continue

                desc = getattr(field_info, "description", None) or getattr(
                    field_info, "title", None
                )
                if desc:
                    descriptions[field_name] = desc

        return descriptions

    def _collect_all_descriptions(self) -> Dict[str, Dict[str, str]]:
        result = {}

        dto_map = {}
        for dto in self.dto_models:
            base_name = self._normalize_model_name(dto.__name__)
            if base_name not in dto_map:
                dto_map[base_name] = {}

            for field, desc in self._get_field_descriptions_from_class(dto).items():
                if field not in dto_map[base_name]:
                    dto_map[base_name][field] = desc

        for model in self.db_models:
            model_name = model.__name__
            result[model_name] = {
                **dto_map.get(model_name, {}),
                **self._get_field_descriptions_from_class(model),
            }

        return result

    def _identify_link_tables(self) -> Set[str]:
        link_tables = set()
        for model in self.db_models:
            try:
                for rel in sa_inspect(model).relationships:
                    if rel.secondary is not None:
                        link_tables.add(rel.secondary.name)
            except Exception:
                continue
        return link_tables

    def _collect_fk_relations(self) -> List[Dict[str, Any]]:
        relations = []
        processed: Set[Tuple[str, str, str, str]] = set()

        for model in self.db_models:
            if model.__tablename__ in self.link_table_names:
                continue

            for col in sa_inspect(model).columns:
                for fk in col.foreign_keys:
                    target_table = fk.column.table.name
                    if target_table in self.link_table_names:
                        continue

                    target_model = self._table_to_model.get(target_table)
                    if not target_model:
                        continue

                    key = (
                        model.__name__,
                        col.name,
                        target_model.__name__,
                        fk.column.name,
                    )

                    if key not in processed:
                        relations.append(
                            {
                                "fromEntity": model.__name__,
                                "fromField": col.name,
                                "toEntity": target_model.__name__,
                                "toField": fk.column.name,
                                "fromMultiplicity": "N",
                                "toMultiplicity": "1",
                            }
                        )
                        processed.add(key)
        return relations

    def _collect_m2m_relations(self) -> List[Dict[str, Any]]:
        relations = []
        processed: Set[Tuple[str, str]] = set()

        for model in self.db_models:
            if model.__tablename__ in self.link_table_names:
                continue

            try:
                for rel in sa_inspect(model).relationships:
                    if rel.direction.name != "MANYTOMANY":
                        continue

                    target_model = rel.mapper.class_
                    if target_model.__tablename__ in self.link_table_names:
                        continue

                    pair = tuple(sorted([model.__name__, target_model.__name__]))
                    if pair not in processed:
                        relations.append(
                            {
                                "fromEntity": pair[0],
                                "fromField": "id",
                                "toEntity": pair[1],
                                "toField": "id",
                                "fromMultiplicity": "N",
                                "toMultiplicity": "N",
                            }
                        )
                        processed.add(pair)
            except Exception:
                continue

        return relations

    def generate(self) -> Dict[str, Any]:
        entities = []

        for model in self.db_models:
            table_name = model.__tablename__
            if table_name in self.link_table_names:
                continue

            columns = sorted(
                sa_inspect(model).columns,
                key=lambda c: (
                    0 if c.primary_key else (1 if c.foreign_keys else 2),
                    c.name,
                ),
            )

            entity_fields = []
            descriptions = self.field_descriptions.get(model.__name__, {})

            for col in columns:
                label = col.name
                if col.primary_key:
                    label += " (PK)"
                if col.foreign_keys:
                    label += " (FK)"

                field_obj = {"id": col.name, "label": label}

                if col.name in descriptions:
                    field_obj["tooltip"] = descriptions[col.name]

                entity_fields.append(field_obj)

            entities.append(
                {"id": model.__name__, "title": table_name, "fields": entity_fields}
            )

        relations = self._collect_fk_relations() + self._collect_m2m_relations()
        return {"entities": entities, "relations": relations}
