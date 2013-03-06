///////////////////////////////////////////////////////////////////////////////
// Page

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

Template.page.loadScripts = function () {
  Meteor.defer(function () {
    /* Sticky Footer Foundation fix */
    // $("footer, .push").height($("footer.row").height()+"px");
    // $(".wrapper").css({'margin-bottom':(-1*$("footer.row").height())+"px"});
    // window.onresize = function() {
    //   $("footer, .push").height($("footer.row").height()+"px");
    //   $(".wrapper").css({'margin-bottom':(-1*$("footer.row").height())+"px"});
    // }
  });
  // return nothing
};