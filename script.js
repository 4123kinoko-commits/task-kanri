/**
 * タスク管理ボード - メインロジック
 */

const PRIORITIES = {
  high: { label: "高", className: "card__priority--high" },
  medium: { label: "中", className: "card__priority--medium" },
  low: { label: "低", className: "card__priority--low" },
};

let columnIdCounter = 0;
let cardIdCounter = 0;
let draggedCard = null;

const board = document.getElementById("board");
const addColumnBtn = document.getElementById("add-column-btn");

/** 初期列を作成 */
function initBoard() {
  createColumn("未着手");
  createColumn("進行中");
  createColumn("完了");
}

/** 列を追加 */
function createColumn(title = "新しい列") {
  columnIdCounter += 1;
  const columnId = `col-${columnIdCounter}`;

  const column = document.createElement("article");
  column.className = "column";
  column.setAttribute("data-column-id", columnId);

  column.innerHTML = `
    <div class="column__header">
      <input
        type="text"
        class="column__title"
        value="${escapeHtml(title)}"
        aria-label="列のタイトル"
        data-column-title
      />
      <button
        type="button"
        class="btn btn--icon column__delete"
        aria-label="列を削除"
        data-action="delete-column"
      >
        ×
      </button>
    </div>
    <div class="column__cards" data-cards-container></div>
    <div class="column__footer">
      <button type="button" class="btn btn--add-card" data-action="show-card-form">
        ＋ カードを追加
      </button>
    </div>
  `;

  board.appendChild(column);
  setupColumnEvents(column);
  setupDropZone(column.querySelector("[data-cards-container]"));
  return column;
}

/** 列のイベント設定 */
function setupColumnEvents(column) {
  column.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "delete-column") {
      if (confirm("この列を削除しますか？列内のカードもすべて削除されます。")) {
        column.remove();
      }
    } else if (action === "show-card-form") {
      showCardForm(column);
    } else if (action === "submit-card") {
      submitCardForm(column, e.target.closest(".card-form"));
    } else if (action === "cancel-card") {
      e.target.closest(".card-form")?.remove();
    } else if (action === "delete-card") {
      e.target.closest(".card")?.remove();
    }
  });
}

/** カード追加フォームを表示 */
function showCardForm(column) {
  const footer = column.querySelector(".column__footer");
  if (footer.querySelector(".card-form")) return;

  const form = document.createElement("div");
  form.className = "card-form";
  form.innerHTML = `
    <input
      type="text"
      class="card-form__input"
      placeholder="カードのタイトル"
      maxlength="100"
      data-card-title-input
    />
    <select class="card-form__select" data-card-priority-input aria-label="優先度">
      <option value="high">優先度：高</option>
      <option value="medium" selected>優先度：中</option>
      <option value="low">優先度：低</option>
    </select>
    <div class="card-form__actions">
      <button type="button" class="btn btn--submit" data-action="submit-card">追加</button>
      <button type="button" class="btn btn--cancel" data-action="cancel-card">キャンセル</button>
    </div>
  `;

  footer.insertBefore(form, footer.firstChild);
  form.querySelector("[data-card-title-input]").focus();
}

/** カードを作成して列に追加 */
function submitCardForm(column, form) {
  if (!form) return;

  const titleInput = form.querySelector("[data-card-title-input]");
  const priorityInput = form.querySelector("[data-card-priority-input]");
  const title = titleInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  const priority = priorityInput.value;
  const container = column.querySelector("[data-cards-container]");
  container.appendChild(createCard(title, priority));
  form.remove();
}

/** カード要素を生成 */
function createCard(title, priority = "medium") {
  cardIdCounter += 1;
  const cardId = `card-${cardIdCounter}`;
  const priorityInfo = PRIORITIES[priority] || PRIORITIES.medium;

  const card = document.createElement("div");
  card.className = "card";
  card.setAttribute("draggable", "true");
  card.setAttribute("data-card-id", cardId);
  card.setAttribute("data-priority", priority);

  card.innerHTML = `
    <div class="card__header">
      <span class="card__title">${escapeHtml(title)}</span>
      <button
        type="button"
        class="btn btn--icon card__delete"
        aria-label="カードを削除"
        data-action="delete-card"
      >
        ×
      </button>
    </div>
    <span class="card__priority ${priorityInfo.className}" data-priority-label>
      ${priorityInfo.label}
    </span>
  `;

  setupCardDrag(card);
  return card;
}

/** カードのドラッグ＆ドロップ */
function setupCardDrag(card) {
  card.addEventListener("dragstart", (e) => {
    draggedCard = card;
    card.classList.add("card--dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.getAttribute("data-card-id"));
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("card--dragging");
    draggedCard = null;
    document.querySelectorAll(".column__cards--drag-over").forEach((el) => {
      el.classList.remove("column__cards--drag-over");
    });
  });
}

/** ドロップ先（カード一覧エリア）の設定 */
function setupDropZone(container) {
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    container.classList.add("column__cards--drag-over");
  });

  container.addEventListener("dragleave", (e) => {
    if (!container.contains(e.relatedTarget)) {
      container.classList.remove("column__cards--drag-over");
    }
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    container.classList.remove("column__cards--drag-over");

    if (!draggedCard) return;

    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement) {
      container.insertBefore(draggedCard, afterElement);
    } else {
      container.appendChild(draggedCard);
    }
  });
}

/** ドロップ位置の直前要素を取得（並び替え用） */
function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll(".card:not(.card--dragging)")];

  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

/** HTMLエスケープ */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** 列追加ボタン */
addColumnBtn.addEventListener("click", () => {
  const title = prompt("新しい列のタイトルを入力してください", "新しい列");
  if (title !== null) {
    createColumn(title.trim() || "新しい列");
  }
});

initBoard();
