///////////////////////////////////////////////////////////////////////////////
// Page

Template.page.appVersion = function () {
  return "v0.9.4";
};

Template.page.group = function () {
  var group = getCurrentGroup();
  if (group) {
    return group;
  } else if (Session.get("groupSlug")) {
    group = Groups.findOne({slug: Session.get("groupSlug")});
    if (!group) { // group hasn't loaded!
      return false;
    } else {
      Session.set("groupId", group._id);
      return Session.get("groupId");      
    }
  } else {
    return false;
  }
};

Template.page.noGroup = function () {
  var group = getCurrentGroup();
  return group ? false : true;
};

Template.page.showGroup = function () {
  return !!Session.get("groupSlug");
};

Template.page.groupName = function () {
  if (Session.get("groupId")) {
    group = getCurrentGroup();
    if (group)
      return group.name;
  }
};

Template.page.events({
  'click .home': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});

Template.page.loadScripts = function () {
  Meteor.defer(function () {
    // Foundation
    $.fn.foundationAlerts           ? $(document).foundationAlerts() : null;
    $.fn.foundationButtons          ? $(document).foundationButtons() : null;
    $.fn.foundationAccordion        ? $(document).foundationAccordion() : null;
    $.fn.foundationNavigation       ? $(document).foundationNavigation() : null;
    $.fn.foundationTopBar           ? $(document).foundationTopBar() : null;
    $.fn.foundationCustomForms      ? $(document).foundationCustomForms() : null;
    $.fn.foundationMediaQueryViewer ? $(document).foundationMediaQueryViewer() : null;
    $.fn.foundationTabs             ? $(document).foundationTabs({callback : $.foundation.customForms.appendCustomMarkup}) : null;
    $.fn.foundationTooltips         ? $(document).foundationTooltips() : null;
    $.fn.foundationMagellan         ? $(document).foundationMagellan() : null;
    $.fn.foundationClearing         ? $(document).foundationClearing() : null;

    $.fn.placeholder                ? $('input, textarea').placeholder() : null;
  });
  // return nothing
};