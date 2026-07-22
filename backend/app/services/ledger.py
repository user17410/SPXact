"""
Trust Ledger — tamper-evident hash-chained append-only log.
Per Architecture §9:
    hash = sha256(prev_hash + canonical_json(payload))
    Any edit to a past entry breaks the chain.
"""
import hashlib
import json
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.models import LedgerEntry


def canonical_json(payload: dict) -> str:
    """Deterministic JSON serialization for hashing."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def compute_hash(prev_hash: str, payload: dict) -> str:
    """SHA-256 of prev_hash + canonical payload."""
    data = prev_hash + canonical_json(payload)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def append_entry(session: Session, attempt_id: int, payload: dict) -> LedgerEntry:
    """
    Append a new hash-chained entry to the Trust Ledger.
    Returns the created LedgerEntry.
    """
    # Get the last entry for the chain
    statement = select(LedgerEntry).order_by(LedgerEntry.seq.desc()).limit(1)  # type: ignore
    last_entry = session.exec(statement).first()

    prev_hash = last_entry.hash if last_entry else "GENESIS"
    seq = (last_entry.seq + 1) if last_entry else 1

    entry_hash = compute_hash(prev_hash, payload)

    entry = LedgerEntry(
        attempt_id=attempt_id,
        seq=seq,
        prev_hash=prev_hash,
        hash=entry_hash,
        payload_json=canonical_json(payload),
        ts=datetime.utcnow(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def verify_chain(session: Session) -> tuple[bool, Optional[int]]:
    """
    Verify the entire ledger chain integrity.
    Returns (is_valid, first_broken_seq or None).
    """
    statement = select(LedgerEntry).order_by(LedgerEntry.seq.asc())  # type: ignore
    entries = session.exec(statement).all()

    if not entries:
        return True, None

    prev_hash = "GENESIS"
    for entry in entries:
        if entry.prev_hash != prev_hash:
            return False, entry.seq

        payload = json.loads(entry.payload_json)
        expected_hash = compute_hash(prev_hash, payload)
        if entry.hash != expected_hash:
            return False, entry.seq

        prev_hash = entry.hash

    return True, None
