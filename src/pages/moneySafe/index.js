import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

import { useStateContext } from "../../../context/StateContext";


const EMPTY_TRANSACTION_FORM = {
  accountID: "",
  transactionType: "Deposit",
  amount: "",
  description: "",
};

const MoneySafePage = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { userInfo, loadingUser } = useStateContext();

  const t = (en, ar) => (isRTL ? ar : en);

  // =====================================================
  // DATA
  // =====================================================

  const [accounts, setAccounts] = useState([]);

  const [summary, setSummary] = useState({
    CashBalance: 0,
    VisaBalance: 0,
    BankTransferBalance: 0,
    InstapayBalance: 0,
    VodafoneCashBalance: 0,
    TotalBalance: 0,
  });

  const [transactions, setTransactions] = useState([]);

  // =====================================================
  // LOADING AND ERRORS
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // TRANSACTION FILTERS
  // =====================================================

  const [accountFilter, setAccountFilter] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // =====================================================
  // MODALS
  // =====================================================

  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showOpeningBalanceForm, setShowOpeningBalanceForm] = useState(false);

  // =====================================================
  // FORMS
  // =====================================================

  const [transactionForm, setTransactionForm] = useState({
    ...EMPTY_TRANSACTION_FORM,
  });

  const [openingAccountID, setOpeningAccountID] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const money = (value) =>
    Number(value || 0).toLocaleString(isRTL ? "ar-EG" : "en-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // =====================================================
  // FORMAT QUANTITY / ID
  // =====================================================

  const numberFormat = (value) =>
    Number(value || 0).toLocaleString(isRTL ? "ar-EG" : "en-EG");

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDateTime = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString(isRTL ? "ar-EG" : "en-GB");
  };

  // =====================================================
  // LOAD MONEY SAFE ACCOUNTS AND SUMMARY
  // =====================================================

  const loadMoneySafe = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/moneySafe");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t(
              "Failed to load Money Safe.",
              "تعذر تحميل الخزنة."
            )
        );
      }

      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);

      setSummary(
        data.summary || {
          CashBalance: 0,
          VisaBalance: 0,
          BankTransferBalance: 0,
          InstapayBalance: 0,
          VodafoneCashBalance: 0,
          TotalBalance: 0,
        }
      );
    } catch (loadError) {
      console.error("Load Money Safe error:", loadError);

      setError(
        loadError.message ||
          t(
            "Failed to load Money Safe.",
            "تعذر تحميل الخزنة."
          )
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD TRANSACTION HISTORY
  // =====================================================

  const loadTransactions = async (filters = {}) => {
    const selectedAccount =
      filters.accountFilter !== undefined
        ? filters.accountFilter
        : accountFilter;

    const selectedType =
      filters.transactionTypeFilter !== undefined
        ? filters.transactionTypeFilter
        : transactionTypeFilter;

    const selectedFromDate =
      filters.fromDate !== undefined ? filters.fromDate : fromDate;

    const selectedToDate =
      filters.toDate !== undefined ? filters.toDate : toDate;

    try {
      setTransactionsLoading(true);

      const params = new URLSearchParams();

      if (selectedAccount) {
        params.set("accountID", selectedAccount);
      }

      if (selectedType) {
        params.set("transactionType", selectedType);
      }

      if (selectedFromDate) {
        params.set("fromDate", selectedFromDate);
      }

      if (selectedToDate) {
        params.set("toDate", selectedToDate);
      }

      const query = params.toString();

      const response = await fetch(
        query
          ? `/api/moneySafe/transactions?${query}`
          : "/api/moneySafe/transactions"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t(
              "Failed to load transactions.",
              "تعذر تحميل الحركات المالية."
            )
        );
      }

      setTransactions(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Load Money Safe transactions error:", loadError);

      toast.error(
        loadError.message ||
          t(
            "Failed to load transactions.",
            "تعذر تحميل الحركات المالية."
          )
      );
    } finally {
      setTransactionsLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (loadingUser) return;

    loadMoneySafe();
    loadTransactions();
  }, [loadingUser]);

  // =====================================================
  // FILTER TRANSACTIONS
  // =====================================================

  const handleFilter = () => {
    loadTransactions();
  };

  const handleClearFilters = () => {
    setAccountFilter("");
    setTransactionTypeFilter("");
    setFromDate("");
    setToDate("");

    loadTransactions({
      accountFilter: "",
      transactionTypeFilter: "",
      fromDate: "",
      toDate: "",
    });
  };

  // =====================================================
  // OPEN MONEY IN FORM
  // =====================================================

  const handleMoneyIn = () => {
    setError("");
    setSuccess("");

    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      transactionType: "Deposit",
    });

    setShowTransactionForm(true);
  };

  // =====================================================
  // OPEN MONEY OUT FORM
  // =====================================================

  const handleMoneyOut = () => {
    setError("");
    setSuccess("");

    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      transactionType: "Expense",
    });

    setShowTransactionForm(true);
  };

  // =====================================================
  // OPEN OPENING BALANCE FORM
  // =====================================================

  const handleOpeningBalance = () => {
    setError("");
    setSuccess("");

    setOpeningAccountID("");
    setOpeningBalance("");
    setOpeningNotes("");

    setShowOpeningBalanceForm(true);
  };

  // =====================================================
  // CLOSE TRANSACTION FORM
  // =====================================================

  const handleCloseTransactionForm = () => {
    if (saving) return;

    setShowTransactionForm(false);
    setTransactionForm({ ...EMPTY_TRANSACTION_FORM });
  };

  // =====================================================
  // CLOSE OPENING BALANCE FORM
  // =====================================================

  const handleCloseOpeningBalanceForm = () => {
    if (saving) return;

    setShowOpeningBalanceForm(false);
    setOpeningAccountID("");
    setOpeningBalance("");
    setOpeningNotes("");
  };

  // =====================================================
  // UPDATE TRANSACTION FORM
  // =====================================================

  const handleTransactionChange = (event) => {
    const { name, value } = event.target;

    setTransactionForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // SAVE MONEY IN / MONEY OUT TRANSACTION
  // =====================================================

  const handleSaveTransaction = async (event) => {
    event.preventDefault();

    if (!transactionForm.accountID) {
      toast.error(
        t(
          "Please select an account.",
          "من فضلك اختر الحساب."
        )
      );
      return;
    }

    if (
      transactionForm.amount === "" ||
      !Number.isFinite(Number(transactionForm.amount)) ||
      Number(transactionForm.amount) <= 0
    ) {
      toast.error(
        t(
          "Please enter a valid amount greater than zero.",
          "من فضلك أدخل مبلغًا صحيحًا أكبر من صفر."
        )
      );
      return;
    }

    const allowedManualTypes = [
      "Deposit",
      "Expense",
      "AdjustmentIn",
      "AdjustmentOut",
      "Withdrawal",
    ];

    if (!allowedManualTypes.includes(transactionForm.transactionType)) {
      toast.error(
        t(
          "This transaction type cannot be entered manually.",
          "لا يمكن تسجيل هذا النوع من الحركات يدويًا."
        )
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/moneySafe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountID: Number(transactionForm.accountID),
          transactionType: transactionForm.transactionType,
          amount: Number(transactionForm.amount),
          description: transactionForm.description.trim() || null,
          userID: userInfo?.UserID
            ? Number(userInfo.UserID)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t(
              "Failed to save the transaction.",
              "تعذر حفظ الحركة المالية."
            )
        );
      }

      toast.success(
        t(
          "Transaction saved successfully.",
          "تم حفظ الحركة المالية بنجاح."
        )
      );

      setShowTransactionForm(false);
      setTransactionForm({ ...EMPTY_TRANSACTION_FORM });

      await loadMoneySafe();
      await loadTransactions();
    } catch (saveError) {
      console.error("Save Money Safe transaction error:", saveError);

      toast.error(
        saveError.message ||
          t(
            "Unable to save the transaction.",
            "تعذر حفظ الحركة المالية."
          )
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SAVE OPENING BALANCE
  // =====================================================

  const handleSaveOpeningBalance = async (event) => {
    event.preventDefault();

    if (!openingAccountID) {
      toast.error(
        t(
          "Please select an account.",
          "من فضلك اختر الحساب."
        )
      );
      return;
    }

    if (
      openingBalance === "" ||
      !Number.isFinite(Number(openingBalance)) ||
      Number(openingBalance) <= 0
    ) {
      toast.error(
        t(
          "Opening balance must be greater than zero.",
          "يجب أن يكون الرصيد الافتتاحي أكبر من صفر."
        )
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/moneySafe/openingBalance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountID: Number(openingAccountID),
          openingBalance: Number(openingBalance),
          notes: openingNotes.trim() || null,
          userID: userInfo?.UserID
            ? Number(userInfo.UserID)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t(
              "Failed to set the opening balance.",
              "تعذر تسجيل الرصيد الافتتاحي."
            )
        );
      }

      toast.success(
        t(
          "Opening balance saved successfully.",
          "تم حفظ الرصيد الافتتاحي بنجاح."
        )
      );

      setShowOpeningBalanceForm(false);
      setOpeningAccountID("");
      setOpeningBalance("");
      setOpeningNotes("");

      await loadMoneySafe();
      await loadTransactions();
    } catch (saveError) {
      console.error("Opening balance error:", saveError);

      toast.error(
        saveError.message ||
          t(
            "Unable to set the opening balance.",
            "تعذر تسجيل الرصيد الافتتاحي."
          )
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // TRANSACTION DIRECTION
  // =====================================================

  const isMoneyIn = (transactionType) =>
    ["Opening", "Payment", "Deposit", "AdjustmentIn"].includes(
      transactionType
    );

  // =====================================================
  // TRANSACTION TYPE LABEL
  // =====================================================

  const transactionTypeLabel = (transactionType) => {
    const labels = {
      Opening: t("Opening Balance", "رصيد افتتاحي"),
      Payment: t("Patient Payment", "دفعة مريض"),
      Deposit: t("Deposit", "إيداع"),
      Purchase: t("Store Purchase", "مشتريات المخزن"),
      Expense: t("Expense", "مصروف"),
      AdjustmentIn: t("Adjustment In", "تسوية بالزيادة"),
      AdjustmentOut: t("Adjustment Out", "تسوية بالنقص"),
      Withdrawal: t("Withdrawal", "سحب"),
    };

    return labels[transactionType] || transactionType || "—";
  };

  // =====================================================
  // ACCOUNT NAME
  // =====================================================

  const accountName = (account) => {
    const paymentMethod = account.PaymentMethod;

    const names = {
      Cash: t("Cash", "نقدي"),
      Visa: t("Visa", "فيزا"),
      "Bank Transfer": t("Bank Transfer", "تحويل بنكي"),
      Instapay: t("Instapay", "إنستاباي"),
      "Vodafone Cash": t("Vodafone Cash", "فودافون كاش"),
    };

    return names[paymentMethod] || account.AccountName || paymentMethod;
  };

  // =====================================================
  // TRANSACTION TYPE OPTIONS
  // Payment and Purchase are intentionally excluded
  // because they will be recorded by their source modules.
  // =====================================================

  const transactionTypeOptions = [
    {
      value: "Deposit",
      label: t("Deposit", "إيداع"),
      direction: "in",
    },
    {
      value: "AdjustmentIn",
      label: t("Adjustment In", "تسوية بالزيادة"),
      direction: "in",
    },
    {
      value: "Expense",
      label: t("Expense", "مصروف"),
      direction: "out",
    },
    {
      value: "Withdrawal",
      label: t("Withdrawal", "سحب"),
      direction: "out",
    },
    {
      value: "AdjustmentOut",
      label: t("Adjustment Out", "تسوية بالنقص"),
      direction: "out",
    },
  ];

  const currentDirection =
    ["Deposit", "AdjustmentIn"].includes(transactionForm.transactionType)
      ? "in"
      : "out";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="money-safe-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* PAGE HEADER */}
      <header className="money-safe-header">
        <div>
          <h1>{t("Money Safe", "الخزنة المالية")}</h1>
          <p>
            {t(
              "Manage balances, incoming money, expenses, and financial movements.",
              "إدارة الأرصدة والمبالغ الواردة والمصروفات والحركات المالية."
            )}
          </p>
        </div>

        <div className="money-safe-header-actions">
          <button
            type="button"
            className="money-safe-btn money-safe-btn-secondary"
            onClick={handleOpeningBalance}
            disabled={userInfo?.RoleID !== 11}
          >
            {t("Opening Balance", "الرصيد الافتتاحي")}
          </button>

          <button
            type="button"
            className="money-safe-btn money-safe-btn-primary"
            onClick={handleMoneyIn}
            disabled={userInfo?.RoleID !== 11}
          >
            + {t("Money In", "إضافة أموال")}
          </button>

          <button
            type="button"
            className="money-safe-btn money-safe-btn-danger"
            onClick={handleMoneyOut}
            disabled={userInfo?.RoleID !== 11}
          >
            − {t("Money Out", "صرف أموال")}
          </button>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="money-safe-alert money-safe-alert-error" role="alert">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="money-safe-alert money-safe-alert-success" role="status">
          {success}
        </div>
      )}

      {/* SUMMARY CARDS */}
      <section className="money-safe-summary">
        <article className="money-safe-card">
          <span>{t("Cash", "نقدي")}</span>
          <strong>{money(summary.CashBalance)} {t("EGP", "جنيه")}</strong>
        </article>

        <article className="money-safe-card">
          <span>{t("Visa", "فيزا")}</span>
          <strong>{money(summary.VisaBalance)} {t("EGP", "جنيه")}</strong>
        </article>

        <article className="money-safe-card">
          <span>{t("Bank Transfer", "تحويل بنكي")}</span>
          <strong>
            {money(summary.BankTransferBalance)} {t("EGP", "جنيه")}
          </strong>
        </article>

        <article className="money-safe-card">
          <span>{t("Instapay", "إنستاباي")}</span>
          <strong>{money(summary.InstapayBalance)} {t("EGP", "جنيه")}</strong>
        </article>

        <article className="money-safe-card">
          <span>{t("Vodafone Cash", "فودافون كاش")}</span>
          <strong>
            {money(summary.VodafoneCashBalance)} {t("EGP", "جنيه")}
          </strong>
        </article>

        <article className="money-safe-card money-safe-total-card">
          <span>{t("Total Balance", "إجمالي الرصيد")}</span>
          <strong>{money(summary.TotalBalance)} {t("EGP", "جنيه")}</strong>
        </article>
      </section>

      {/* TRANSACTION HISTORY */}
      <section className="money-safe-panel">
        <div className="money-safe-panel-heading">
          <div>
            <h2>{t("Transaction History", "سجل الحركات المالية")}</h2>
            <p>
              {t("Transactions shown:", "عدد الحركات المعروضة:")}{" "}
              <strong>{numberFormat(transactions.length)}</strong>
            </p>
          </div>

          <button
            type="button"
            className="money-safe-btn money-safe-btn-secondary"
            onClick={() => {
              loadMoneySafe();
              loadTransactions();
            }}
            disabled={loading || transactionsLoading}
          >
            {loading || transactionsLoading
              ? t("Loading...", "جارٍ التحميل...")
              : t("Refresh", "تحديث")}
          </button>
        </div>

        {/* FILTERS */}
        <div className="money-safe-filters">
          <div className="money-safe-filter-field">
            <label htmlFor="moneySafeAccountFilter">
              {t("Account", "الحساب")}
            </label>

            <select
              id="moneySafeAccountFilter"
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
            >
              <option value="">{t("All Accounts", "كل الحسابات")}</option>

              {accounts.map((account) => (
                <option
                  key={account.MoneySafeAccountID}
                  value={account.MoneySafeAccountID}
                >
                  {accountName(account)}
                </option>
              ))}
            </select>
          </div>

          <div className="money-safe-filter-field">
            <label htmlFor="moneySafeTypeFilter">
              {t("Transaction Type", "نوع الحركة")}
            </label>

            <select
              id="moneySafeTypeFilter"
              value={transactionTypeFilter}
              onChange={(event) =>
                setTransactionTypeFilter(event.target.value)
              }
            >
              <option value="">
                {t("All Transactions", "كل الحركات")}
              </option>
              <option value="Opening">
                {t("Opening Balance", "رصيد افتتاحي")}
              </option>
              <option value="Payment">
                {t("Patient Payment", "دفعة مريض")}
              </option>
              <option value="Deposit">
                {t("Deposit", "إيداع")}
              </option>
              <option value="Purchase">
                {t("Store Purchase", "مشتريات المخزن")}
              </option>
              <option value="Expense">
                {t("Expense", "مصروف")}
              </option>
              <option value="AdjustmentIn">
                {t("Adjustment In", "تسوية بالزيادة")}
              </option>
              <option value="AdjustmentOut">
                {t("Adjustment Out", "تسوية بالنقص")}
              </option>
              <option value="Withdrawal">
                {t("Withdrawal", "سحب")}
              </option>
            </select>
          </div>

          <div className="money-safe-filter-field">
            <label htmlFor="moneySafeFromDate">
              {t("From Date", "من تاريخ")}
            </label>
            <input
              id="moneySafeFromDate"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>

          <div className="money-safe-filter-field">
            <label htmlFor="moneySafeToDate">
              {t("To Date", "إلى تاريخ")}
            </label>
            <input
              id="moneySafeToDate"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>

          <div className="money-safe-filter-actions">
            <button
              type="button"
              className="money-safe-btn money-safe-btn-primary"
              onClick={handleFilter}
              disabled={transactionsLoading}
            >
              {transactionsLoading
                ? t("Loading...", "جارٍ التحميل...")
                : t("Filter", "تصفية")}
            </button>

            <button
              type="button"
              className="money-safe-btn money-safe-btn-secondary"
              onClick={handleClearFilters}
            >
              {t("Clear", "مسح")}
            </button>
          </div>
        </div>

        {/* TRANSACTION TABLE */}
        {loading && accounts.length === 0 ? (
          <div className="money-safe-state">
            {t("Loading Money Safe...", "جارٍ تحميل الخزنة المالية...")}
          </div>
        ) : transactionsLoading ? (
          <div className="money-safe-state">
            {t("Loading transactions...", "جارٍ تحميل الحركات المالية...")}
          </div>
        ) : transactions.length === 0 ? (
          <div className="money-safe-state">
            {t(
              "No transactions found for the selected filters.",
              "لا توجد حركات مالية تطابق عوامل التصفية المحددة."
            )}
          </div>
        ) : (
          <div className="money-safe-table-wrapper">
            <table className="money-safe-table">
              <thead>
                <tr>
                  <th>{t("Date", "التاريخ")}</th>
                  <th>{t("Account", "الحساب")}</th>
                  <th>{t("Transaction Type", "نوع الحركة")}</th>
                  <th>{t("Amount", "المبلغ")}</th>
                  <th>{t("Description", "الوصف")}</th>
                  <th>{t("Reference", "المرجع")}</th>
                  <th>{t("Recorded By", "تم التسجيل بواسطة")}</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((transaction) => {
                  const moneyIn = isMoneyIn(transaction.TransactionType);

                  return (
                    <tr key={transaction.MoneySafeTransactionID}>
                      <td>{formatDateTime(transaction.TransactionDate)}</td>

                      <td>
                        <div className="money-safe-account-name">
                          {accountName({
                            AccountName: transaction.AccountName,
                            PaymentMethod: transaction.PaymentMethod,
                          })}
                        </div>
                      </td>

                      <td>
                        {transactionTypeLabel(transaction.TransactionType)}
                      </td>

                      <td>
                        <span
                          className={
                            moneyIn
                              ? "money-safe-amount money-safe-in"
                              : "money-safe-amount money-safe-out"
                          }
                        >
                          {moneyIn ? "+" : "−"}
                          {money(transaction.Amount)} {t("EGP", "جنيه")}
                        </span>
                      </td>

                      <td>{transaction.Description || "—"}</td>

                      <td>
                        {transaction.ReferenceType
                          ? `${transaction.ReferenceType}${
                              transaction.ReferenceID
                                ? ` #${numberFormat(transaction.ReferenceID)}`
                                : ""
                            }`
                          : "—"}
                      </td>

                      <td>
                        {transaction.UserName ||
                          transaction.FullName ||
                          "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          MONEY IN / MONEY OUT MODAL
      ===================================================== */}
      {showTransactionForm && (
        <div
          className="money-safe-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseTransactionForm();
            }
          }}
        >
          <section
            className="money-safe-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moneySafeTransactionTitle"
          >
            <header className="money-safe-modal-header">
              <div>
                <h2 id="moneySafeTransactionTitle">
                  {currentDirection === "in"
                    ? t("Money In", "إضافة أموال")
                    : t("Money Out", "صرف أموال")}
                </h2>

                <p>
                  {t(
                    "Record a manual financial movement.",
                    "تسجيل حركة مالية يدوية."
                  )}
                </p>
              </div>

              <button
                type="button"
                className="money-safe-close-button"
                onClick={handleCloseTransactionForm}
                disabled={saving}
                aria-label={t("Close", "إغلاق")}
              >
                ×
              </button>
            </header>

            <form
              className="money-safe-form"
              onSubmit={handleSaveTransaction}
            >
              <div className="money-safe-form-grid">
                {/* ACCOUNT */}
                <div className="money-safe-field">
                  <label htmlFor="transactionAccountID">
                    {t("Account", "الحساب")} *
                  </label>

                  <select
                    id="transactionAccountID"
                    name="accountID"
                    value={transactionForm.accountID}
                    onChange={handleTransactionChange}
                    required
                  >
                    <option value="">
                      {t("Select an account", "اختر الحساب")}
                    </option>

                    {accounts.map((account) => (
                      <option
                        key={account.MoneySafeAccountID}
                        value={account.MoneySafeAccountID}
                      >
                        {accountName(account)} —{" "}
                        {money(account.CurrentBalance)}{" "}
                        {t("EGP", "جنيه")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TRANSACTION TYPE */}
                <div className="money-safe-field">
                  <label htmlFor="transactionType">
                    {t("Transaction Type", "نوع الحركة")} *
                  </label>

                  <select
                    id="transactionType"
                    name="transactionType"
                    value={transactionForm.transactionType}
                    onChange={handleTransactionChange}
                    required
                  >
                    {transactionTypeOptions
                      .filter((option) => option.direction === currentDirection)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </div>

                {/* AMOUNT */}
                <div className="money-safe-field">
                  <label htmlFor="transactionAmount">
                    {t("Amount (EGP)", "المبلغ (جنيه)")} *
                  </label>

                  <input
                    id="transactionAmount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={handleTransactionChange}
                    placeholder={t("Enter amount", "أدخل المبلغ")}
                    required
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="money-safe-field money-safe-field-full">
                  <label htmlFor="transactionDescription">
                    {t("Description / Reason", "الوصف / السبب")} *
                  </label>

                  <textarea
                    id="transactionDescription"
                    name="description"
                    value={transactionForm.description}
                    onChange={handleTransactionChange}
                    placeholder={t(
                      "Enter a description or reason for this movement",
                      "أدخل وصفًا أو سببًا لهذه الحركة"
                    )}
                    maxLength={500}
                    rows={3}
                    required
                  />
                </div>
              </div>

              <div className="money-safe-form-actions">
                <button
                  type="button"
                  className="money-safe-btn money-safe-btn-secondary"
                  onClick={handleCloseTransactionForm}
                  disabled={saving}
                >
                  {t("Cancel", "إلغاء")}
                </button>

                <button
                  type="submit"
                  className="money-safe-btn money-safe-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? t("Saving...", "جارٍ الحفظ...")
                    : t("Save Transaction", "حفظ الحركة المالية")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* =====================================================
          OPENING BALANCE MODAL
      ===================================================== */}
      {showOpeningBalanceForm && (
        <div
          className="money-safe-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseOpeningBalanceForm();
            }
          }}
        >
          <section
            className="money-safe-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moneySafeOpeningBalanceTitle"
          >
            <header className="money-safe-modal-header">
              <div>
                <h2 id="moneySafeOpeningBalanceTitle">
                  {t("Opening Balance", "الرصيد الافتتاحي")}
                </h2>

                <p>
                  {t(
                    "Enter the initial balance for an account.",
                    "أدخل الرصيد الأولي للحساب."
                  )}
                </p>
              </div>

              <button
                type="button"
                className="money-safe-close-button"
                onClick={handleCloseOpeningBalanceForm}
                disabled={saving}
                aria-label={t("Close", "إغلاق")}
              >
                ×
              </button>
            </header>

            <form
              className="money-safe-form"
              onSubmit={handleSaveOpeningBalance}
            >
              <div className="money-safe-form-grid">
                {/* ACCOUNT */}
                <div className="money-safe-field">
                  <label htmlFor="openingAccountID">
                    {t("Account", "الحساب")} *
                  </label>

                  <select
                    id="openingAccountID"
                    value={openingAccountID}
                    onChange={(event) =>
                      setOpeningAccountID(event.target.value)
                    }
                    required
                  >
                    <option value="">
                      {t("Select an account", "اختر الحساب")}
                    </option>

                    {accounts.map((account) => (
                      <option
                        key={account.MoneySafeAccountID}
                        value={account.MoneySafeAccountID}
                        disabled={Number(account.CurrentBalance) !== 0}
                      >
                        {accountName(account)} —{" "}
                        {t("Current balance:", "الرصيد الحالي:")}{" "}
                        {money(account.CurrentBalance)} {t("EGP", "جنيه")}
                      </option>
                    ))}
                  </select>

                  <small className="money-safe-field-hint">
                    {t(
                      "Opening balances can only be set for accounts whose current balance is zero.",
                      "يمكن تسجيل الرصيد الافتتاحي للحسابات التي رصيدها الحالي صفر فقط."
                    )}
                  </small>
                </div>

                {/* OPENING BALANCE */}
                <div className="money-safe-field">
                  <label htmlFor="openingBalance">
                    {t("Opening Balance (EGP)", "الرصيد الافتتاحي (جنيه)")} *
                  </label>

                  <input
                    id="openingBalance"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={openingBalance}
                    onChange={(event) => setOpeningBalance(event.target.value)}
                    placeholder={t("Enter opening balance", "أدخل الرصيد الافتتاحي")}
                    required
                  />
                </div>

                {/* NOTES */}
                <div className="money-safe-field money-safe-field-full">
                  <label htmlFor="openingNotes">
                    {t("Notes", "ملاحظات")}
                  </label>

                  <textarea
                    id="openingNotes"
                    value={openingNotes}
                    onChange={(event) => setOpeningNotes(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder={t(
                      "Optional notes about the opening balance",
                      "ملاحظات اختيارية عن الرصيد الافتتاحي"
                    )}
                  />
                </div>
              </div>

              <div className="money-safe-form-actions">
                <button
                  type="button"
                  className="money-safe-btn money-safe-btn-secondary"
                  onClick={handleCloseOpeningBalanceForm}
                  disabled={saving}
                >
                  {t("Cancel", "إلغاء")}
                </button>

                <button
                  type="submit"
                  className="money-safe-btn money-safe-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? t("Saving...", "جارٍ الحفظ...")
                    : t("Save Opening Balance", "حفظ الرصيد الافتتاحي")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default MoneySafePage;