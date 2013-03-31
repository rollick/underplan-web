///////////////////////////////////////////////////////////////////////////////
// Activity comment

Template.commentForm.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.commentForm.events({
  'click .save': function (event, template) {
    var submit = template.find(".save.button");
    if($(submit).hasClass("disabled"))
      return false;

    var comment = template.find("form .comment").value;
    var activityId = template.find("form .activity-id").value;
    
    if (activityId && Meteor.userId() && comment.length) {
      Meteor.call('createComment', {comment: comment, activityId: activityId}, function (error, commentId) {
        if (error) {
          Session.set("createError", [error.error, error.reason].join(": "));
        } else {
          Session.set("lastUpdatedActivityId", activityId)
          template.find(".comment").value = "";
        }
      });
    } else {
      Session.set("createError",
                  "It needs a comment");
    }
    return false;
  },
  'keyup .comment': function (event, template) {
    var comment = template.find(".comment").value,
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

Template.comment.canDelete = function () {
  var userId = Meteor.userId();
  var groupId = Activities.findOne(this.activityId).group;

  return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || this.owner === userId);
}

Template.comment.events({
  'click .remove': function (event, template) {
    event.preventDefault();
    event.stopPropagation();

    $(template.find("blockquote")).addClass("disabled");

    Comments.remove(this._id);

    return false;
  }
});
