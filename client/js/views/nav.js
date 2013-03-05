// Template.mainNav.rendered = function () {
//   // Init plugins
//   $(document).foundation("topbar", function (response) {
//     console.log(response.errors);
//   });
// };

Template.mainNav.appVersion = function () {
  return Session.get("appVersion");
};

Template.mainNav.group = function () {
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

Template.mainNav.events({
  'click .home': function () {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .main-home': function () {
    Router.setHome();
    return false;
  }
});