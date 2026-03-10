from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum
from typing import Optional, Union, List

class ActionType(str, Enum):
    FAVORITE = "FAVORITE"
    RATING = "RATING"
    ADD_BOOKSHELF = "ADD_BOOKSHELF"
    SEARCH_CLICK = "SEARCH_CLICK"
    VIEW = "VIEW"
    READ_TIME = "READ_TIME"

class UserBehaviorEvent(BaseModel):
    eventId: str
    userId: str
    bookId: str
    actionType: ActionType
    value: float = 1.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

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
