///////////////////////////////////////////////////////////////////////////////
// Templates

pageOptions = {
  currentActivity:  {highContent: true, singleItem: true},
  storyEditor:      {highContent: true, singleItem: true},
  shortyEditor:     {highContent: true, singleItem: true},
  activityFeed:     {highContent: true, isFeed: true},
  mainHome:         {highContent: true, isHome: true},
  permaShorty:      {highContent: true, singleItem: true}
};

///////////////////////////////////////////////////////////////////////////////
// Page
Template.page.helpers({
  mainTemplate: function () {
    var templateName = Session.get("mainTemplate");
    if (templateName) {
      Session.set("pageOptions", pageOptions[templateName]);

      return Template[templateName]();
    } else {
      return "Loading...";
    }
  }
});

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
    Router.setHome();
    return false;
  }
});