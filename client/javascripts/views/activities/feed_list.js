///////////////////////////////////////////////////////////////////////////////
// Activity feed 

var feedLimitSkip = 5;

Template.activityFeed.helpers({
  feedTitle: function() {
    text = "All Activities";
    if (!Template.feedList.feedLimitReached()) {
      text = "Last " + Session.get("feedLimit") + " Activities";
    }

    // larger displays
    var html = "<h4 class=\"hide-for-small\">";
    html += Template.feedList.feedLimitReached() ? "All Activities" : "Last " + Session.get("feedLimit") + " Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h4>";

    var h5Style = "wide";
    if (Session.get("feedLimit") > 9) {
      h5Style = "wider";
    }

    // small displays
    html += "<h4 class=\"show-for-small " + h5Style + "\">Last " + Session.get("feedLimit") + "</h4>";

    html += "<h5 class=\"show-for-small " + h5Style + "\">Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h5>";

    return new Handlebars.SafeString(html);
  }
});

Template.activityFeed.events({
  'click .new-short': function (event, template) {
    $(".short-form.row").show().find("textarea").focus();
    return false;
  },
  "click .new-story": function () {
    Router.setNewActivity(getCurrentGroup());
    return false;
  },
  "click a.feed-all": function () {
    Session.set("feedLimit", Template.activityFeed.activityCount() + 1);
    return false;
  }
});

Template.activityFeed.loading = function () {
  return (typeof(feedListSubscription) == 'object' && !feedListSubscription.ready()) && 
         (typeof(feedMapSubscription) == 'object' && !feedMapSubscription.ready());
};

Template.activityFeed.created = function() {
  var filter = ReactiveFeedFilter.get("country");
  logIfDev("FeedFilter set here (1)");
  ReactiveFeedFilter.set("feedFilter", $.extend(filter, {group: Session.get("groupId")}));
  Session.set("galleryLimit", galleryLimitSkip);
};

Template.activityFeed.rendered = function () {
  // Create an event to be triggered when map element is in the DOM
  // See hack here: http://jsfiddle.net/Zzw2M/33/light/
  $(".feed-list").removeClass("faded");
};

Template.activityFeed.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

// FIXME: these two functions need to be fixed. What should each return?
Template.activityFeed.activityCount = function () {
  return Activities.find(ReactiveFeedFilter.get('queryFields')).count();
};

Template.activityFeed.totalActivities = function () {
  return Activities.find(ReactiveFeedFilter.get('queryFields')).count();
}

///////////////////////////////////////////////////////////////////////////////
// Activity feed list

Template.feedList.events({
  "click .feed-more a": function () {
    Session.set("feedLimit", Session.get("feedLimit") + feedLimitSkip);
    return false;
  }
})

Template.feedList.anyActivities = function () {
  return Template.activityFeed.activityCount() > 0;
};

Template.feedList.recentActivities = function () {
  // never return activities without a group
  return Activities.find(ReactiveFeedFilter.get('queryFields'), {sort: {created: -1}, limit: Session.get("feedLimit")});
};

Template.feedList.feedLimitReached = function () {
  return Session.get("feedLimit") >= Activities.find(ReactiveFeedFilter.get('queryFields')).count();
};

// FIXME: this is a hack! Should be able to use "unless" feedLimitReached in template
//        but it only seems to work for a single reference.
Template.feedList.moreActivities = function() {
  return Session.get("feedLimit") < Activities.find(ReactiveFeedFilter.get('queryFields')).count();
};

///////////////////////////////////////////////////////////////////////////////
// Feed Item View

// Template.short.preserve([".short.entry.expanded"]);

Template.feedItem.events({
  'click .remove': function (event, template) {
    $(template.find(".comment")).addClass("disabled");
    Comments.remove(this._id);

    return false;
  },
  'mouseenter .comment': function (event, template) {
    $(template.find(".remove")).show();
  },
  'mouseleave .comment': function (event, template) {
    $(template.find(".remove")).hide();
  },
  'click .activity a.title': function (event, template) {
    Router.setActivity(this);
    return false;
  },
  'click .item-actions a.comments': function (event, template) {
    toggleComments(template);
    return false;
  },
  'click .item-actions .new-comment a': function (event, template) {
    if (!!$(event.target).closest("a").hasClass("disabled")) {
      return false;
    }

    toggleComments(template, true, true);
    return false;
  }
});

Template.feedItem.typeIs = function (what) {
  return this.type === what;
};

Template.feedItem.lastCommented = function () {
  return Session.equals("lastUpdatedActivityId", this._id);
}

Template.feedItem.lastUpdated = function () {
  return Session.equals("lastUpdatedActivity", this._id);
}

// override this method to specify a different short
Template.feedItem.activity = function() {
  return this;
};

Template.feedItem.expandClass = function () {
  var status = activityCommentStatus[this._id];

  if (status == "open") {
    return "expanded";
  } else {
    return "";
  }
};

var toggleComments = function(template, expand, focus) {
  expand = expand || false;
  focus = focus || false;

  var item = $(template.find(".feed-item"));
  var id = item.attr("id");
  var activityIds = Session.get("expandedActivities") || [];

  if (item.hasClass("expanded") && !expand) {
    item.removeClass("expanded");
    hideFeedCommentsNotice(item);
    activityCommentStatus[id] = "closed";
    
  } else {
    item.addClass("expanded");
    setFeedCommentsNotice(template);
    activityCommentStatus[id] = "open";
    activityIds.push(id);
    Session.set("expandedActivities", activityIds);

    if (focus)
      item.find("#comment").focus();
  }
}

///////////////////////////////////////////////////////////////////////////////
// Story Feed Content

Template.storyFeedContent.helpers(itemHelpers);

Template.storyFeedContent.events({
  'mouseenter .activity': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave .activity': function (event, template) {
    $(template.find(".actions")).hide();
  },
});


///////////////////////////////////////////////////////////////////////////////
// Feed Item Actions

Template.feedItemActions.hasComments = function () {
  return Comments.find({activityId: this._id}).count() > 0;
};

Template.feedItemActions.countText = function () {
  var count = Comments.find({activityId: this._id}).count();
  var text = count;

  text += (count > 1 || count == 0) ? " comments" : " comment";

  return text;
};