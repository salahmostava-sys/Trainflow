export function InventoryScreen({ active = false }: { active?: boolean }) {
  return (
    <section className={active ? "panel active" : "panel"} id="panel-inventory">
      <div className="ops-card">
        <h3 data-i18n="inventorySummaryTitle">Inventory summary</h3>
        <p className="inventory-intro" data-i18n="inventoryIntro">
          Codes with you are unused codes in the system. Supervisor balances
          decrease automatically when new codes are added.
        </p>
        <p className="ops-status" id="inventory-message-hint"></p>
        <div
          className="inventory-message"
          id="inventory-message"
          dir="auto"
        ></div>
        <div className="inventory-actions">
          <button
            id="inventory-copy-message"
            className="resource-btn"
            type="button"
            data-i18n="inventoryCopyMessage"
          >
            Copy message
          </button>
          <button
            id="inventory-copy-image"
            className="resource-btn"
            type="button"
            data-i18n="inventoryCopyImage"
          >
            Copy as image
          </button>
        </div>
      </div>
    </section>
  );
}
