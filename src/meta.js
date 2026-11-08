/* Domain metadata : what the CBS simulator settings mean (from ProcessCbsRequestV2 / 10_cdci_txnmgr.xml). */

export const TXNS = {
  "010042": "List account",
  "010043": "Set PIN",
  "010044": "Debit",
  "010045": "Credit",
  "010049": "Balance inquiry",
  "010052": "Check status",
  "010053": "Credit reversal",
  "010054": "Debit reversal",
  "010056": "Lien amount",
  "010058": "Unblock / execute",
  "010060": "Update mandate",
  "010065": "Lien without UPI PIN",
  "010066": "Check status (UDIR)",
  "010070": "Credit partial reversal",
  "010071": "Debit partial reversal",
  "010074": "SBMD mandate",
  "010075": "ICCW debit",
  "010076": "ICCW debit reversal",
};
export const txnName = (code) => TXNS[code] || "Unknown txn";

/**
 * type: bool | text | number | accounts (comma list) | accountsWrapped (",a,b," - matched with contains(",acc,"))
 */
export const ENV_GROUPS = [
  {
    id: "responses", title: "Default CBS responses",
    desc: "Used when 'Use account RC mappings' is off and random responses are off for the transaction: balance, lien, mandate and check-status return these values in field 55 / 56. For debit, credit and reversals ProcessCbsRequestV2 currently overwrites field 39 with the configured RC afterwards, so the *_RESP RCs have no effect for them.",
    fields: [
      ["DEBIT_RESP", "Debit RC", "text"],
      ["CREDIT_RESP", "Credit RC", "text"],
      ["DEBIT_REVERSAL_RESP", "Debit reversal RC", "text"],
      ["CREDIT_REVERSAL_RESP", "Credit reversal RC", "text"],
      ["SET_PIN_RESP", "Set PIN RC", "text"],
      ["SUCCESS_RC", "Success RC (other txns)", "text"],
      ["TXN_STATUS_RESP", "Check status RC", "text"],
      ["CHK_REVERSAL_RESP", "Check status (UDIR) response", "text", "rc|reversal-rc"],
      ["BALANCE_ENQUIRY_RESP", "Balance inquiry response", "text", "ledger|available"],
      ["LIEN_AMOUNT_RESP", "Lien amount response", "text", "lien-id|ddmmyyyy"],
      ["LIEN_AMOUNT_WITHOUT_UPI_PIN_RESP", "Lien w/o PIN response", "text", "lien-id|ddmmyyyy"],
      ["UNBLOCK_EXECUTE_RESP", "Unblock / execute response", "text"],
      ["UPDATE_MANDATE_RESP", "Update mandate response", "text", "id|ddmmyyyy"],
      ["SUCCESS_TIMEOUT_RCS", "RCs treated as success / timeout", "accounts", "e.g. 00,91"],
    ],
  },
  {
    id: "random", title: "Random responses",
    desc: "On: the response comes from the CBS RC logic (account mapping / RC Mappings). Off: the default response above is used.",
    fields: [
      ["ENABLE_RND_010044", "Debit", "bool"],
      ["ENABLE_RND_010045", "Credit", "bool"],
      ["ENABLE_RND_010054", "Debit reversal", "bool"],
      ["ENABLE_RND_010053", "Credit reversal", "bool"],
      ["ENABLE_RND_010049", "Balance inquiry", "bool"],
      ["ENABLE_RND_010052", "Check status", "bool"],
      ["ENABLE_RND_010066", "Check status (UDIR)", "bool"],
      ["ENABLE_RND_010056", "Lien amount", "bool"],
      ["ENABLE_RND_010065", "Lien w/o PIN", "bool"],
      ["ENABLE_RND_010058", "Unblock / execute", "bool"],
      ["ENABLE_RND_010060", "Update mandate", "bool"],
      ["ENABLE_RND_010043", "Set PIN", "bool"],
    ],
  },
  {
    id: "behaviour", title: "Behaviour",
    fields: [
      ["ENABLE_TXN_ACC_BASE_RC_MAPPING", "Use account RC mappings (financial_rc.cfg)", "bool"],
      ["ENABLE_RESOLVE_CHKTXN_FROM_ORG_TXN", "Resolve check status from the original txn", "bool"],
      ["ENABLE_LIST_ACCOUNT_CFG_FILE", "List account from cfg file", "bool"],
      ["DELAY_BUFFER", "Delay jitter (ms added to mapped delays)", "number"],
      ["NON_PERSISTENT_ACCOUNT", "Accounts not stored in Redis (NP / NA scenarios)", "accounts"],
    ],
  },
  {
    id: "hold", title: "Hold responses",
    desc: "A held transaction gets no response. Flags hold for every account; account lists hold only those accounts.",
    fields: [
      ["HOLD_CREDIT_CHK_TXN_RESP", "Hold credit check-txn response", "bool"],
      ["HOLD_CREDIT_CHK_TXN_RESP_ACC", "… only for accounts", "accountsWrapped"],
      ["HOLD_DEBIT_CHK_TXN_RESP", "Hold debit check-txn response", "bool"],
      ["HOLD_DEBIT_CHK_TXN_RESP_ACC", "… only for accounts", "accountsWrapped"],
      ["HOLD_UDIR_CREDIT_CHK_TXN", "Hold UDIR credit check-txn", "bool"],
      ["HOLD_UDIR_CREDIT_CHK_TXN_ACC", "… only for accounts", "accountsWrapped"],
      ["HOLD_CHK_TXN_UDIR_RESP", "Hold check-txn (UDIR) response", "bool"],
      ["HOLD_CHK_TXN_UDIR_RESP_ACC", "… only for accounts", "accountsWrapped"],
      ["HOLD_REV_RESP", "Hold reversal response", "bool"],
      ["HOLD_REV_RESP_ACC", "… only for accounts", "accounts"],
      ["HOLD_SUCCESS_REV_RESP_ACC", "Hold successful reversal for accounts", "accounts"],
    ],
  },
  {
    id: "reversal", title: "Reversal failures",
    fields: [
      ["FAIL_REVERSAL_RESP", "Fail reversals", "bool"],
      ["REVERSAL_FAILURE_RC", "Reversal failure RC", "text"],
    ],
  },
  {
    id: "account", title: "List account defaults",
    desc: "Used for list account when no mobile mapping in financial_rc.cfg matches. One value per account, comma separated.",
    fields: [
      ["ACCOUNT_HOLDER_NAME", "Account holder name", "text"],
      ["CLEAR_ACC_NUMS", "Account numbers", "accounts"],
      ["IFSC_CODES", "IFSC codes", "accounts"],
      ["MMIDS", "MMIDs", "text"],
      ["AEBA_FLAGS", "AEBA flags", "text", "Y,N"],
      ["MBEBA_FLAGS", "MBEBA flags", "text", "N,Y"],
      ["ACCOUNT_CATEGORIES", "Account categories", "text", "SB,CC"],
      ["ACC_TYPES", "Account types", "text", "GEN,GEN"],
    ],
  },
  {
    id: "legacy", title: "Legacy",
    desc: "Read by the deploy XML but not used by ProcessCbsRequestV2 (replaced by the credit / debit hold flags).",
    fields: [
      ["HOLD_CHK_TXN_RESP", "Hold check-txn response", "bool"],
      ["HOLD_CHK_TXN_RESP_ACC", "Hold check-txn response accounts", "accounts"],
    ],
  },
];

export const KNOWN_ENV = new Map(ENV_GROUPS.flatMap((g) => g.fields.map(([key, label, type, hint]) => [key, { key, label, type, hint, group: g.id }])));

/* RC colours : 00 success, 91 timeout / deemed, others failure. */
export function rcTone(rc) {
  const r = String(rc || "").split("|")[0].trim();
  if (r === "00" || r === "000") return "ok";
  if (r === "91" || r === "130") return "warn";
  if (!r) return "muted";
  return "bad";
}

/** "rc,delay,inhibit" <-> {rc, delay, hold} */
export function parseRcValue(v) {
  const [rc = "", delay = "", hold = ""] = String(v ?? "").split(",");
  return { rc: rc.trim(), delay: delay.trim(), hold: hold.trim().toLowerCase() === "true" };
}
export function formatRcValue({ rc, delay, hold }, { compact = false } = {}) {
  if (compact) {
    if (!delay && !hold) return rc;
    return `${rc},${delay}${hold ? ",true" : ""}`;
  }
  return `${rc},${delay || "0"},${hold ? "true" : "false"}`;
}
