///////////////////////////////////////////////////////////////////////////////
// Templates

pageOptions = {
  currentActivity:  {showMap: true},
  storyEditor:      {showMap: true, singleItem: true},
  shortyEditor:     {showMap: true, singleItem: true},
  activityFeed:     {showMap: true, showCountryFilter: true},
  mainHome:         {showMap: true, isHome: true},
  blank:            {showMap: true, fullscreenMap: true, showCountryFilter: true}
};

///////////////////////////////////////////////////////////////////////////////
// Page
Template.page.helpers({
  navCls: function () {
    var opts = Session.get("pageOptions");
    return (opts && opts.showMap) ? "high-content" : "normal";
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