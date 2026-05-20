from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from enum import Enum
from typing import Optional, Union, List

class ActionType(str, Enum):
    FAVORITE      = "FAVORITE"
    UNFAVORITE    = "UNFAVORITE"    # Negative signal: bỏ thích sách
    RATING        = "RATING"
    ADD_BOOKSHELF = "ADD_BOOKSHELF"
    SEARCH_CLICK  = "SEARCH_CLICK"
    VIEW          = "VIEW"
    READ_TIME     = "READ_TIME"

class UserBehaviorEvent(BaseModel):
    eventId: str
    userId: str
    bookId: str
    actionType: ActionType
    value: float = 1.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('userId', 'bookId', mode='before')
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        """Guard against empty/whitespace IDs that would create phantom DB records."""
        if not isinstance(v, str) or not v.strip():
            raise ValueError("userId and bookId must be non-empty strings")
        return v.strip()

    @field_validator('value', mode='before')
    @classmethod
    def validate_value(cls, v) -> float:
        """Coerce value to float early; actual range check is done in model_validator."""
        try:
            return float(v)
        except (TypeError, ValueError):
            raise ValueError(f"value must be a number, got: {v!r}")

    @model_validator(mode='after')
    def validate_range_by_action(self) -> 'UserBehaviorEvent':
        """
        Per-action validation:
        - RATING   : value must be in [1.0, 5.0]
        - READ_TIME: value must be >= 0 (minutes read, cannot be negative)
        """
        if self.actionType == ActionType.RATING:
            if not (1.0 <= self.value <= 5.0):
                raise ValueError(
                    f"RATING value must be between 1.0 and 5.0, got {self.value}"
                )
        elif self.actionType == ActionType.READ_TIME:
            if self.value < 0:
                raise ValueError(
                    f"READ_TIME value must be >= 0 (minutes), got {self.value}"
                )
        return self

    @field_validator('timestamp', mode='before')
    @classmethod
    def parse_timestamp(cls, v):
        if isinstance(v, list):
            # Spring Boot/Jackson default LocalDateTime array format: [year, month, day, hour, minute, second, nano]
            return datetime(v[0], v[1], v[2], v[3], v[4], v[5], v[6] // 1000 if len(v) > 6 else 0)
        return v

class UserItemScore(BaseModel):
    userId: str
    bookId: str
    totalScore: float = 0.0
    lastUpdatedAt: datetime = Field(default_factory=datetime.utcnow)
