from sqlalchemy import text

from database.database import engine, Base


# =========================================
# DATABASE MIGRATION
# =========================================

with engine.begin() as connection:

    # Check existing columns in transactions table
    result = connection.execute(
        text("PRAGMA table_info(transactions)")
    )

    existing_columns = [
        row[1] for row in result
    ]

    # Add merchant column if it does not already exist
    if "merchant" not in existing_columns:
        connection.execute(
            text(
                "ALTER TABLE transactions "
                "ADD COLUMN merchant VARCHAR(100)"
            )
        )

        print("Added merchant column to transactions table.")

    else:
        print("Merchant column already exists.")


# Create any new tables from the updated models
Base.metadata.create_all(bind=engine)

print("Database migration completed successfully!")