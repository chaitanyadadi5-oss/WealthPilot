from datetime import date

from database.database import SessionLocal
from database.crud import (
    create_transaction,
    get_transactions,
    update_transaction,
    delete_transaction
)


# Create a database session
db = SessionLocal()


# --------------------------------
# 1. CREATE
# --------------------------------
print("\n--- CREATE ---")

transaction = create_transaction(
    db=db,
    user_id=1,
    description="Ordered pizza",
    amount=450,
    date=date.today(),
    transaction_type="expense",
    category="Food",
    predicted_category="Food"
)

print(
    f"Created: ID={transaction.id}, "
    f"{transaction.description}, "
    f"₹{transaction.amount}, "
    f"{transaction.category}"
)


# --------------------------------
# 2. READ
# --------------------------------
print("\n--- READ ---")

transactions = get_transactions(db, user_id=1)

for transaction in transactions:
    print(
        f"ID={transaction.id} | "
        f"{transaction.description} | "
        f"₹{transaction.amount} | "
        f"{transaction.category}"
    )


# --------------------------------
# 3. UPDATE
# --------------------------------
print("\n--- UPDATE ---")

updated_transaction = update_transaction(
    db=db,
    transaction_id=transaction.id,
    amount=500
)

print(
    f"Updated: ID={updated_transaction.id}, "
    f"{updated_transaction.description}, "
    f"₹{updated_transaction.amount}, "
    f"{updated_transaction.category}"
)


# --------------------------------
# 4. READ AGAIN
# --------------------------------
print("\n--- READ AFTER UPDATE ---")

transactions = get_transactions(db, user_id=1)

for transaction in transactions:
    print(
        f"ID={transaction.id} | "
        f"{transaction.description} | "
        f"₹{transaction.amount} | "
        f"{transaction.category}"
    )


# --------------------------------
# 5. DELETE
# --------------------------------
print("\n--- DELETE ---")

deleted_transaction = delete_transaction(
    db=db,
    transaction_id=transaction.id
)

print(
    f"Deleted: ID={deleted_transaction.id}, "
    f"{deleted_transaction.description}"
)


# --------------------------------
# 6. READ AFTER DELETE
# --------------------------------
print("\n--- READ AFTER DELETE ---")

transactions = get_transactions(db, user_id=1)

for transaction in transactions:
    print(
        f"ID={transaction.id} | "
        f"{transaction.description} | "
        f"₹{transaction.amount} | "
        f"{transaction.category}"
    )


# Close the database session
db.close()