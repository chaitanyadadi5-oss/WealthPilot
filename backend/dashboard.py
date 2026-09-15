from decimal import Decimal


ZERO = Decimal("0")


def to_decimal(value):
    if value is None:
        return ZERO

    return Decimal(str(value))


def build_dashboard(
    transactions,
    budgets=None,
    savings_goals=None,
    planned_expenses=None,
    actual_savings=None,
    current_month=None,
):
    budgets = budgets or []
    savings_goals = savings_goals or []
    planned_expenses = planned_expenses or []
    actual_savings = actual_savings or []

    # =========================================
    # CURRENT MONTH FILTERING
    # =========================================

    def transaction_month(transaction):
        return transaction.date.strftime("%Y-%m")

    if current_month:
        monthly_transactions = [
            transaction
            for transaction in transactions
            if transaction_month(transaction) == current_month
        ]
    else:
        monthly_transactions = list(transactions)

    monthly_budgets = [
        budget
        for budget in budgets
        if current_month is None or budget.month == current_month
    ]

    monthly_savings_goals = [
        goal
        for goal in savings_goals
        if current_month is None or goal.month == current_month
    ]

    monthly_planned_expenses = [
        expense
        for expense in planned_expenses
        if current_month is None or expense.month == current_month
    ]

    monthly_actual_savings = [
        saving
        for saving in actual_savings
        if current_month is None
        or saving.date.strftime("%Y-%m") == current_month
    ]

    # =========================================
    # INCOME / EXPENSE CALCULATIONS
    # =========================================

    total_income = ZERO
    total_expenses = ZERO
    expenses_by_category = {}

    for transaction in monthly_transactions:
        amount = to_decimal(transaction.amount)
        transaction_type = (
            transaction.transaction_type or ""
        ).strip().lower()

        if transaction_type == "income":
            total_income += amount

        elif transaction_type == "expense":
            total_expenses += amount

            category = (
                transaction.category or "Other"
            ).strip()

            expenses_by_category[category] = (
                expenses_by_category.get(category, ZERO)
                + amount
            )

    calculated_savings = (
        total_income - total_expenses
    )

    savings_rate = (
        float(
            (calculated_savings / total_income) * 100
        )
        if total_income > ZERO
        else 0.0
    )

    # =========================================
    # ACTUAL SAVINGS
    # =========================================

    actual_saved = sum(
        (
            to_decimal(saving.amount)
            for saving in monthly_actual_savings
        ),
        ZERO,
    )

    # =========================================
    # BUDGET CALCULATIONS
    # =========================================

    total_budget = sum(
        (
            to_decimal(budget.amount)
            for budget in monthly_budgets
        ),
        ZERO,
    )

    actual_budget_spending = total_expenses

    budget_remaining = (
        total_budget - actual_budget_spending
    )

    budget_utilization = (
        float(
            (actual_budget_spending / total_budget)
            * 100
        )
        if total_budget > ZERO
        else 0.0
    )

    # =========================================
    # PLANNED EXPENSES
    # =========================================

    total_planned_expenses = sum(
        (
            to_decimal(expense.planned_amount)
            for expense in monthly_planned_expenses
        ),
        ZERO,
    )

    planned_expense_margin = (
        total_budget - total_planned_expenses
    )

    # =========================================
    # SAVINGS GOALS
    # =========================================

    total_savings_goal = sum(
        (
            to_decimal(goal.target_amount)
            for goal in monthly_savings_goals
        ),
        ZERO,
    )

    goal_amount_remaining = (
        total_savings_goal - actual_saved
    )

    if goal_amount_remaining < ZERO:
        goal_amount_remaining = ZERO

    savings_goal_progress = (
        float(
            min(
                (actual_saved / total_savings_goal)
                * 100,
                Decimal("100"),
            )
        )
        if total_savings_goal > ZERO
        else 0.0
    )

    # =========================================
    # PLANNED VS ACTUAL BY CATEGORY
    # =========================================

    planned_by_category = {}

    for expense in monthly_planned_expenses:
        category = (
            expense.category or "Other"
        ).strip()

        planned_by_category[category] = (
            planned_by_category.get(category, ZERO)
            + to_decimal(expense.planned_amount)
        )

    planned_vs_actual = []

    all_categories = sorted(
        set(planned_by_category)
        | set(expenses_by_category)
    )

    for category in all_categories:
        planned = planned_by_category.get(
            category,
            ZERO,
        )

        actual = expenses_by_category.get(
            category,
            ZERO,
        )

        difference = planned - actual

        planned_vs_actual.append(
            {
                "category": category,
                "planned": float(planned),
                "actual": float(actual),
                "difference": float(difference),
                "status": (
                    "under"
                    if difference >= ZERO
                    else "over"
                ),
            }
        )

    # =========================================
    # TOP SPENDING CATEGORY
    # =========================================

    top_spending_category = None
    top_spending_amount = ZERO

    if expenses_by_category:
        top_spending_category = max(
            expenses_by_category,
            key=expenses_by_category.get,
        )

        top_spending_amount = expenses_by_category[
            top_spending_category
        ]

    # =========================================
    # RECENT TRANSACTIONS
    # =========================================

    recent_transactions = sorted(
        transactions,
        key=lambda transaction: (
            transaction.date,
            transaction.id,
        ),
        reverse=True,
    )[:5]

    # =========================================
    # SAVINGS COACH
    # =========================================

    savings_coach = []

    if total_savings_goal > ZERO:
        if actual_saved >= total_savings_goal:
            savings_coach.append(
                "Great work! You have reached your monthly savings goal."
            )

        elif actual_saved > ZERO:
            savings_coach.append(
                f"You have saved ₹{float(actual_saved):,.2f} "
                f"towards your ₹{float(total_savings_goal):,.2f} goal."
            )

            savings_coach.append(
                f"₹{float(goal_amount_remaining):,.2f} "
                "more is needed to reach your goal."
            )

        else:
            savings_coach.append(
                "You have not recorded any actual savings "
                "for this month yet."
            )

    if calculated_savings < ZERO:
        savings_coach.append(
            "Your expenses are higher than your income "
            "for this month. Review your spending."
        )

    elif total_income > ZERO and savings_rate < 10:
        savings_coach.append(
            "Your current savings rate is below 10%. "
            "Consider reducing non-essential spending."
        )

    elif savings_rate >= 20:
        savings_coach.append(
            "Excellent! Your current savings rate is "
            f"{savings_rate:.1f}%."
        )

    if top_spending_category:
        savings_coach.append(
            f"Your highest spending category is "
            f"{top_spending_category}."
        )

    if total_budget > ZERO:
        if actual_budget_spending > total_budget:
            savings_coach.append(
                "You are currently over your total monthly "
                "budget. Review your highest spending categories."
            )

        elif budget_utilization >= 80:
            savings_coach.append(
                "You have used 80% or more of your monthly "
                "budget. Monitor remaining spending carefully."
            )

    # =========================================
    # RETURN DASHBOARD DATA
    # =========================================

    return {
        "summary": {
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "calculated_savings": float(
                calculated_savings
            ),
            "actual_saved": float(actual_saved),
            "savings_rate": savings_rate,
        },

        "expenses_by_category": {
            category: float(amount)
            for category, amount
            in expenses_by_category.items()
        },

        "recent_transactions": recent_transactions,

        "planning": {
            "total_budget": float(total_budget),

            # Correct meaning:
            # budget - actual spending
            "budget_remaining": float(
                budget_remaining
            ),

            "budget_utilization": budget_utilization,

            "total_planned_expenses": float(
                total_planned_expenses
            ),

            "planned_expense_margin": float(
                planned_expense_margin
            ),

            "planned_vs_actual": planned_vs_actual,
        },

        "savings": {
            "goal": float(total_savings_goal),
            "actual_saved": float(actual_saved),
            "remaining": float(
                goal_amount_remaining
            ),
            "progress": savings_goal_progress,
            "calculated_savings": float(
                calculated_savings
            ),
        },

        "insights": {
            "top_spending_category": (
                top_spending_category
            ),
            "top_spending_amount": float(
                top_spending_amount
            ),
        },

        "savings_coach": savings_coach,

        "current_month": current_month,
    }