///////////////////////////////////////////////////////////////////////////////
// Activity comment

var saveComment = function (template, success) {
  Session.set("createError", null);
  var btns = $(template.find(".save.button, .cancel.button"));
  if(btns.hasClass("disabled")) {
    return false;
  } else {
    btns.addClass("disabled");
  }

  var comment = template.find("form #comment").value;
  var activityId = template.find("form #activity-id").value;
  
  // Clear input here and then re-set if save fails
  template.find("#comment").value = "";

  if (activityId && Meteor.userId() && comment.length) {
    Meteor.call('createComment', {comment: comment, activityId: activityId}, function (error, commentId) {
      if (error) {
        Session.set("createError", [error.error, error.reason].join(": "));
        template.find("#comment").value = comment;        
      } else {
        if (_.isFunction(success)) { success.call(commentId); }
      }
    });
  } else {
    Session.set("createError",
                "It needs a comment");
  }
  btns.removeClass("disabled");

  return false;
};

Template.commentForm.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.commentForm.events({
  'focus #comment': function (event, template) {
    $(template.find(".comment-form")).addClass("expanded");

    if(!_.isNull(feedPackery))
      feedPackery.layout();

    return false;
  },
  'click .cancel': function (event, template) {
    $(template.find(".comment-form")).removeClass("expanded");

    if(!_.isNull(feedPackery))
      feedPackery.layout();

    return false;
  },
  'click .save': function (event, template) {
    return saveComment(template, function () {repackFeed();});
  },
  'keyup #comment': function (event, template) {
    var comment = template.find("#comment").value,
        submit =  template.find(".save.button");

    if(comment.length > 0) {
      $(submit).removeClass("disabled");
    } else {
      $(submit).addClass("disabled");
    }
  },
});

Template.commentForm.error = function () {
  return Session.get("createError");
};

Template.commentForm.rendered = function () {
};

///////////////////////////////////////////////////////////////////////////////
// Comments list

Template.commentList.anyComments = function () {
  return Comments.find({activityId: this._id}).count() > 0;
};

Template.commentList.comments = function () {
  return Comments.find({activityId: this._id}, {sort: {created: 1}});
};

///////////////////////////////////////////////////////////////////////////////
// Comment

Template.comment.canRemove = function () {
  var userId = Meteor.userId();
  var groupId = Activities.findOne(this.activityId).group;

  return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || this.owner === userId);
}

Template.comment.events({
  'click .remove': function (event, template) {
    $(template.find(".comment")).addClass("disabled");
    Comments.remove(this._id);

    return false;
  },
  'mouseenter .comment': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave .comment': function (event, template) {
    $(template.find(".actions")).hide();
  } 

});
