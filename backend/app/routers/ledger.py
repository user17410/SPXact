"""
Ledger router — GET /ledger for the Trust Ledger feed.
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import LedgerEntry
from app.schemas import LedgerEntryResponse
from app.services.ledger import verify_chain

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("", response_model=list[LedgerEntryResponse])
def get_ledger(limit: int = Query(default=50, le=200), session: Session = Depends(get_session)):
    """Get latest ledger entries (hash-chained)."""
    statement = select(LedgerEntry).order_by(LedgerEntry.seq.desc()).limit(limit)  # type: ignore
    entries = session.exec(statement).all()
    return entries


@router.get("/verify")
def verify_ledger(session: Session = Depends(get_session)):
    """Verify the integrity of the Trust Ledger hash chain."""
    is_valid, broken_seq = verify_chain(session)
    return {
        "valid": is_valid,
        "broken_at_seq": broken_seq,
        "message": "Ledger integrity verified" if is_valid else f"Chain broken at seq {broken_seq}",
    }
