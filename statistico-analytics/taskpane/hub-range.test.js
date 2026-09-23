const fs = require("fs");
const path = require("path");

const elements = {};
function makeEl() {
  const classes = new Set();
  const attrs = {};
  return {
    textContent: "",
    style: {},
    classList: {
      toggle: function (name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains: function (name) { return classes.has(name); }
    },
    setAttribute: function (key, value) { attrs[key] = String(value); },
    getAttribute: function (key) { return Object.prototype.hasOwnProperty.call(attrs, key) ? attrs[key] : null; },
    contains: function () { return false; }
  };
}
[
  "hubWdataBar",
  "hubRangeKindLabel",
  "hubRangeBadgeText",
  "hubRangeSizeLabel",
  "hubRangeSourceLabel",
  "hubDataIssueText",
  "hubDataReviewBtn"
].forEach(function (id) { elements[id] = makeEl(); });

global.window = global;
global.document = {
  getElementById: function (id) { return elements[id] || null; },
  addEventListener: function () {}
};

const hub = require("./hub-range.js");

function grid(dataRows, blanksInFirstCol) {
  const headers = ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];
  const rows = [headers];
  for (let r = 0; r < dataRows; r++) {
    const row = [];
    for (let c = 0; c < headers.length; c++) {
      row.push(r < blanksInFirstCol && c === 0 ? "" : r * 10 + c + 1);
    }
    rows.push(row);
  }
  return rows;
}

describe("worksheet data card summary", () => {
  test("names the sheet, address, and variable count", () => {
    const summary = hub.describeWorksheetData(grid(150, 0), "Prepared_Data!A1:J151");
    expect(summary.headline).toBe("Prepared_Data · A1:J151");
    expect(summary.size).toBe("151 rows × 10 variables");
    expect(summary.issueLabel).toBe("");
  });

  test("promotes the shortcut when missing values are present", () => {
    const summary = hub.describeWorksheetData(grid(150, 60), "'Prepared_Data'!$A$1:$J$151");
    expect(summary.headline).toBe("Prepared_Data · A1:J151");
    expect(summary.issueLabel).toBe("60 records with missing values");
    expect(summary.problems.recordsWithMissing).toBe(60);
  });

  test("counts a record once when several of its cells are missing", () => {
    const problems = hub.countDataProblems([
      ["A", "B", "C"],
      ["", "", 1],
      [2, 3, 4],
      ["", 5, ""]
    ]);
    expect(problems.recordsWithMissing).toBe(2);
    expect(problems.label).toBe("2 records with missing values");
  });

  test("uses the singular when one record has a missing value", () => {
    expect(hub.describeWorksheetData(grid(2, 1), "Sheet1!A1:J3").issueLabel).toBe(
      "1 record with missing values"
    );
  });

  test("does not count a completely empty row as missing values", () => {
    const values = [
      ["A", "B"],
      ["", ""],
      [1, 2]
    ];
    const problems = hub.countDataProblems(values);
    expect(problems.recordsWithMissing).toBe(0);
    expect(problems.emptyRows).toBe(1);
    expect(problems.label).toBe("1 empty row detected");
  });

  test("flags a blank header when nothing else is wrong", () => {
    const problems = hub.countDataProblems([
      ["Score", ""],
      [1, 2],
      [3, 4]
    ]);
    expect(problems.label).toBe("1 column has no header");
  });
});

describe("prepare shortcut on the data card", () => {
  beforeEach(() => {
    Object.keys(elements).forEach(function (id) {
      elements[id].textContent = "";
      elements[id].classList.toggle("is-ready", false);
      elements[id].classList.toggle("is-error", false);
      elements[id].classList.toggle("has-data-issues", false);
    });
  });

  test("marks the card when the loaded range has missing values", () => {
    hub.applyRangeData(grid(150, 60), "Prepared_Data!A1:J151");
    const bar = document.getElementById("hubWdataBar");
    expect(bar.classList.contains("is-ready")).toBe(true);
    expect(bar.classList.contains("has-data-issues")).toBe(true);
    expect(document.getElementById("hubRangeBadgeText").textContent).toBe("Prepared_Data · A1:J151");
    expect(document.getElementById("hubRangeSizeLabel").textContent).toBe("151 rows × 10 variables");
    expect(document.getElementById("hubDataIssueText").textContent).toBe("60 records with missing values");
    expect(document.getElementById("hubDataReviewBtn").getAttribute("aria-label")).toBe(
      "60 records with missing values · Review data"
    );
  });

  test("clears the prominent shortcut when the next range is clean", () => {
    hub.applyRangeData(grid(150, 60), "Prepared_Data!A1:J151");
    hub.applyRangeData(grid(4, 0), "Sheet1!A1:J5");
    const bar = document.getElementById("hubWdataBar");
    expect(bar.classList.contains("has-data-issues")).toBe(false);
    expect(document.getElementById("hubDataIssueText").textContent).toBe("");
  });
});

describe("Data Preparation stays one module with two entry points", () => {
  const root = __dirname;
  const html = fs.readFileSync(path.join(root, "hub.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "hub-app-apps.js"), "utf8");

  test("the Statistical Methods card links to the same prepare module", () => {
    expect(html).toContain('id="hubPrepareDataBtn"');
    expect(html).toContain("Prepare data");
    expect(html).toContain("Review data");
    expect(html).toContain('data-st-tip="Check, clean, recode, or create a prepared worksheet."');
    expect(html).toContain("hubOpenPrepareData(event)");
    expect(app).toContain('openPrepareDataFromHub("prepare-data")');
    expect(app).toContain("tools: PREPARE_CATEGORY_TILES.concat(TOOLS_CATEGORY_TILES)");
    expect(app).not.toContain("analytics: PREPARE_CATEGORY_TILES");
  });
});
