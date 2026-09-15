from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime


# =========================================
# DATABASE CONNECTION
# =========================================

DATABASE_URL = "sqlite:///./finance_assistant.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Base class for all database models
Base = declarative_base()

# Database session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# =========================================
# USERS TABLE
# =========================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    # Existing relationships
    transactions = relationship(
        "Transaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    budgets = relationship(
        "Budget",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    savings_goals = relationship(
        "SavingsGoal",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    planned_expenses = relationship(
        "PlannedExpense",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    insights = relationship(
        "Insight",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # New final-feature relationships
    actual_savings = relationship(
        "ActualSaving",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    profile = relationship(
        "Profile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    financial_preferences = relationship(
        "FinancialPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


# =========================================
# TRANSACTIONS TABLE
# =========================================

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    description = Column(
        String(255),
        nullable=False,
    )

    # Merchant extracted from natural-language entry
    merchant = Column(
        String(100),
        nullable=True,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    date = Column(
        Date,
        nullable=False,
        index=True,
    )

    transaction_type = Column(
        String(20),
        nullable=False,
    )

    # Final category selected by the user
    category = Column(
        String(100),
        nullable=False,
    )

    # Original category suggested by the ML model
    predicted_category = Column(
        String(100),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="transactions",
    )

    predictions = relationship(
        "Prediction",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )


# =========================================
# BUDGETS TABLE
# =========================================

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    # Example: 2026-09
    month = Column(
        String(7),
        nullable=False,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="budgets",
    )


# =========================================
# SAVINGS GOALS TABLE
# =========================================

class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    target_amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    # Example: 2026-09
    month = Column(
        String(7),
        nullable=False,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="savings_goals",
    )


# =========================================
# PLANNED EXPENSES TABLE
# =========================================

class PlannedExpense(Base):
    __tablename__ = "planned_expenses"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    category = Column(
        String(100),
        nullable=False,
    )

    description = Column(
        String(255),
        nullable=True,
    )

    planned_amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    # Example: 2026-09
    month = Column(
        String(7),
        nullable=False,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="planned_expenses",
    )


# =========================================
# ACTUAL SAVINGS TABLE
# =========================================
# Stores money that the user explicitly records
# as actually saved.
#
# This is different from:
# calculated savings = income - expenses
#
# Example:
# Income = ₹30,000
# Expenses = ₹22,000
# Calculated savings = ₹8,000
#
# User may actually save only ₹6,000.
# ActualSaving stores that ₹6,000.


class ActualSaving(Base):
    __tablename__ = "actual_savings"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    date = Column(
        Date,
        nullable=False,
        index=True,
    )

    note = Column(
        String(255),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="actual_savings",
    )


# =========================================
# PROFILE TABLE
# =========================================
# Optional personal/profile information.
#
# Sensitive fields are optional and are not
# required for the finance assistant to work.


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    age = Column(
        Integer,
        nullable=True,
    )

    gender = Column(
        String(50),
        nullable=True,
    )

    profession = Column(
        String(100),
        nullable=True,
    )

    marital_status = Column(
        String(50),
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="profile",
    )


# =========================================
# FINANCIAL PREFERENCES TABLE
# =========================================
# Stores finance-related preferences that help
# personalize dashboard insights and reminders.


class FinancialPreference(Base):
    __tablename__ = "financial_preferences"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Example: "₹20,000 - ₹30,000"
    monthly_income_range = Column(
        String(100),
        nullable=True,
    )

    # Example: "Salary", "Business", "Freelance"
    income_source = Column(
        String(100),
        nullable=True,
    )

    # Current application is INR-focused.
    currency = Column(
        String(10),
        nullable=False,
        default="INR",
    )

    # Example: "Emergency Fund", "Education",
    # "Travel", "General Savings"
    financial_goal = Column(
        String(150),
        nullable=True,
    )

    # Preferred monthly savings target
    savings_target = Column(
        Numeric(12, 2),
        nullable=True,
    )

    # Whether the user wants financial reminders
    reminders_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    user = relationship(
        "User",
        back_populates="financial_preferences",
    )


# =========================================
# PREDICTIONS TABLE
# =========================================

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    transaction_id = Column(
        Integer,
        ForeignKey("transactions.id"),
        nullable=False,
        index=True,
    )

    predicted_category = Column(
        String(100),
        nullable=False,
    )

    confidence = Column(
        Float,
        nullable=True,
    )

    transaction = relationship(
        "Transaction",
        back_populates="predictions",
    )


# =========================================
# INSIGHTS TABLE
# =========================================

class Insight(Base):
    __tablename__ = "insights"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    message = Column(
        String(500),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="insights",
    )


# =========================================
# CREATE DATABASE TABLES
# =========================================

Base.metadata.create_all(bind=engine)

print("Database and tables created successfully!")