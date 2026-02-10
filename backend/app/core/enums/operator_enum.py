# core/operator_enum.py
from enum import Enum

class OperatorEnum(str, Enum):
    EQUAL = "="
    NOT_EQUAL = "!="
    GREATER_THAN = ">"
    LESS_THAN = "<"
    GREATER_EQUAL = ">="
    LESS_EQUAL = "<="
    IN = "in"
    NOT_IN = "not in"
    CONTAINS = "contains"
    NOT_CONTAINS = "not contains"

# Frontend-friendly labels
OPERATOR_LABELS = {
    OperatorEnum.EQUAL: "Equal to",
    OperatorEnum.NOT_EQUAL: "Not equal to",
    OperatorEnum.GREATER_THAN: "Greater than",
    OperatorEnum.LESS_THAN: "Less than",
    OperatorEnum.GREATER_EQUAL: "Greater than or equal",
    OperatorEnum.LESS_EQUAL: "Less than or equal",
    OperatorEnum.IN: "In",
    OperatorEnum.NOT_IN: "Not in",
    OperatorEnum.CONTAINS: "Contains",
    OperatorEnum.NOT_CONTAINS: "Does not contain",
}
