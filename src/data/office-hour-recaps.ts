/**
 * Static EIP Editing Office Hour recaps.
 *
 * Hand-curated summaries of past office hours, shown in the Office Hours hub
 * (Calls tab + Overview) until the automated call-artifact pipeline covers the
 * office-hour series. Every PR row below was cross-checked against the live
 * governance backend (title / author / status), so it reflects reality rather
 * than the raw meeting notes.
 */

export type OhPrStatus = "MERGED" | "WAITING_ON_EDITOR" | "WAITING_ON_AUTHOR" | "OPEN";

export type OhPrItem = {
  repo: "ercs" | "eips" | "rips";
  pr: number;
  title: string;
  author: string;
  status: OhPrStatus;
  note: string;
};

// Call series slugs used in /calls/<series>/<number> for static office-hour
// style calls (EIP Editing Office Hours now; EIPIP meetings later).
export const OFFICE_HOUR_SERIES = new Set(["eipoh", "eipip"]);

export type OhRecap = {
  series: "eipoh" | "eipip";
  meeting: number;
  dateISO: string; // yyyy-mm-dd
  displayDate: string;
  title: string;
  youtube: string;
  issueUrl: string;
  summary: string;
  prs: OhPrItem[];
  decisions: string[];
  actionItems: string[];
  nextMeeting: string;
};

export const OFFICE_HOUR_RECAPS: OhRecap[] = [
  {
    series: "eipoh",
    meeting: 111,
    dateISO: "2026-08-25",
    displayDate: "Aug 25, 2026",
    title: "EIP Editing Office Hour (EIP + ERC) #111",
    youtube: "https://www.youtube.com/watch?v=ROL9QuD07bc",
    issueUrl: "https://github.com/ethereum/pm/issues/2192",
    summary:
      "Session #111 worked through live and offline reviews of several ERC pull requests. Most needed only minor changes before approval. Sam Wilson gave immediate feedback on structure and formatting and deferred detailed review of the larger PRs to after the call. One submission was flagged for the wrong repository (interface-category proposals belong in the EIP repo, not ERC).",
    prs: [
      { repo: "ercs", pr: 1909, title: "Add ERC: Index-Based Multi-Facet Proxy", author: "Arhemius", status: "MERGED", note: "Quick scan, no changes needed. Approved and merged." },
      { repo: "ercs", pr: 1919, title: "Add ERC: Confidential Agent Policy Verdicts", author: "mzf11125", status: "MERGED", note: "Reviewed with no blocking issues. Merged." },
      { repo: "ercs", pr: 1956, title: "Update ERC-5516: Move to Final", author: "LucasGrasso", status: "MERGED", note: "Approved after a quick review; one date field corrected before merge." },
      { repo: "ercs", pr: 1935, title: "Add ERC: Reference-Relative Slippage Bounds", author: "zexoverz", status: "WAITING_ON_EDITOR", note: "A duplicate interface import was flagged. Author to remove the duplicate before merge." },
      { repo: "ercs", pr: 1942, title: "Add ERC: Token Launch Abuse Detection and Remediation", author: "Cybercentry", status: "WAITING_ON_EDITOR", note: "Reference implementation is large. Sam recommended adding a README linking all relevant files and keeping the implementation minimal." },
      { repo: "ercs", pr: 1910, title: "Add ERC: Agent Memory State Registry", author: "everest-an", status: "WAITING_ON_AUTHOR", note: "Reviewed and considered clean; currently waiting on the author." },
      { repo: "ercs", pr: 1957, title: "Update ERC-8107: Move to Review", author: "KBryan", status: "WAITING_ON_AUTHOR", note: "Reviewed as solid, with a few small changes needed before approval." },
      { repo: "ercs", pr: 1952, title: "Website: Fix the Auto Stagnant Bot", author: "Cybercentry", status: "WAITING_ON_AUTHOR", note: "Larger scope, deferred to offline review after the call." },
    ],
    decisions: [
      "Interface-category submissions must go to the EIP repository, not ERC. Authors submitting interface-type proposals to ERC should be redirected.",
      "ERC-5516 (#1956) approved to move to Final after a quick review; one date field corrected before merge.",
      "A Last Call PR was reviewed and approved; its deadline date was updated to the required format.",
    ],
    actionItems: [
      "Sam: complete the offline detailed review of #1942 and #1952 after the call.",
      "Cybercentry (#1942): add a README to the reference implementation linking all relevant files.",
      "zexoverz (#1935): remove the duplicate interface import to clear the PR for merge.",
      "#1957 author: apply the small changes flagged to finalize the submission.",
      "Editors: leave a note for the miscategorized interface PR author to resubmit to the EIP repository.",
    ],
    nextMeeting: "Meeting #112, Sep 1, 2026",
  },
];

export const LATEST_OFFICE_HOUR_RECAP = OFFICE_HOUR_RECAPS[0];

/** /calls/<series>/<number> path for a recap. */
export const officeHourCallPath = (r: OhRecap) => `/calls/${r.series}/${r.meeting}`;

/** Look up a static office-hour recap by series slug + meeting number. */
export function findOfficeHourRecap(series: string, number: string): OhRecap | null {
  return OFFICE_HOUR_RECAPS.find((r) => r.series === series && String(r.meeting) === number) ?? null;
}
