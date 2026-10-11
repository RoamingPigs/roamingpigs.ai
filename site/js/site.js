/* RoamingPigs Instruments: shared progressive enhancements. */
(function () {
  "use strict";
  var menu = document.querySelector("details.nav-toggle");
  if (!menu) return;
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); }
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) menu.open = false; });
})();
