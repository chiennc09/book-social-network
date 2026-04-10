from pydantic import BaseModel
from typing import List

class RecommendationResponse(BaseModel):
    userId: str
    recommendedBookIds: List[str]
