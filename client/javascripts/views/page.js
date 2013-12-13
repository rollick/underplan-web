///////////////////////////////////////////////////////////////////////////////
// Templates

pageOptions = {
  currentActivity:  {},
  storyEditor:      {singleItem: true},
  shortyEditor:     {singleItem: true},
  activityFeed:     {showCountryFilter: true},
  mainHome:         {isHome: true},
  blank:            {showCountryFilter: true},
  groupMain:        {showCountryFilter: true}
};

///////////////////////////////////////////////////////////////////////////////
// Page
Template.page.helpers({
  navCls: function () {
    return "high-content";
  },
  logoCls: function () {
    var opts = Session.get("pageOptions");
    return (opts && opts.isHome) ? "home" : "";
  },
  mainContentCls: function () {
    var opts = Session.get("pageOptions");
    return (opts && opts.isHome) ? "dashboard" : "normal";
  }
});

Template.page.mainTemplate = function () {
  var templateName = Session.get("mainTemplate");
  if (templateName) {
    Session.set("pageOptions", pageOptions[templateName]);

    return Template[templateName];
  }
};

Template.page.appVersion = function () {
  return Session.get("appVersion");
};

Template.page.pageOptions = function () {
  return Session.get("pageOptions");
};

Template.page.rendered = function () {
  logIfDev("++ Main Page Rendered");
};

Template.page.events({
  'click .main-home': function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setHome();
  }
});