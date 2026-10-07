export function PrometricScreen({ active = false }: { active?: boolean }) {
  return (
    <section className={active ? "panel active" : "panel"} id="panel-prometric">
      <div
        className="cred-card resource-card"
        id="prometric-login-card"
        role="button"
        tabIndex={0}
      >
        <div className="cred-label" data-i18n="prometricLoginLink">
          Prometric login link
        </div>
        <div className="resource-value" id="prometric-link-val"></div>
      </div>
      <button className="cred-card" id="cred-account" type="button">
        <span className="cred-label" data-i18n="prometricAccount">
          Prometric Account
        </span>
        <span className="cred-value" id="cred-account-val"></span>
      </button>
      <button className="cred-card" id="cred-password" type="button">
        <span className="cred-label" data-i18n="prometricPassword">
          Prometric Password
        </span>
        <span className="cred-value" id="cred-password-val"></span>
      </button>
      <a
        className="cred-card resource-card"
        id="zoom-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="cred-label" data-i18n="zoomMeeting">
          Zoom meeting
        </div>
        <div className="resource-value" id="zoom-link-val"></div>
      </a>
    </section>
  );
}
