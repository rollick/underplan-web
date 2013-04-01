
///////////////////////////////////////////////////////////////////////////////
// Comments

/*
  Comments can be added against an activity.
*/

Comments = new Meteor.Collection("comments");

Comments.allow({
  insert: function (userId, comment) {
    return false; // no cowboy inserts -- use createComment method
  },
  update: function (userId, comment, fields, modifier) {
    return false; // no updates for now!
  },
  remove: function (userId, comment) {
    var groupId = Activities.findOne(comment.activityId).group;

    // deny if not the owner or a system admin or the group admin
    return (isGroupAdmin(userId, groupId) || isSystemAdmin(userId) || comment.owner === userId);
  }
});

Meteor.methods({
  // options should include: activityId, comment
  createComment: function (options) {
    options = options || {};

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    if ( typeof options.groupId === "undefined" )
      options.groupId = Activities.findOne({_id: options.activityId}).group;

    // run check before saving. check will throw exceptions on invalid data
    checkCreateComment(this.userId, options);

    var comment = Comments.insert({
      owner:      this.userId,
      comment:    options.comment,
      activityId: options.activityId,
      groupId:    options.groupId,
      created:    options.created
    });

    // Notify group members about new comment
    notifyCommentCreated(this.userId, options);

    return comment;
  },
});

var checkCreateComment = function (userId, options) {
  if (! userId)
    throw new Meteor.Error(403, "You must be logged in");
  if (typeof options.comment === "string" && options.comment.length > 1024 )
    throw new Meteor.Error(413, "Comment too long");
  if (! options.activityId )
    throw new Meteor.Error(413, "No associated activity");
};

if(Meteor.isClient) {
  // Stubbed for client. See isServer block for the actual code
  var notifyCommentCreated = function () {
    return true;
  }
}

if(Meteor.isServer) {

  var notifyCommentCreated = function (userId, options) {
    var commentor = Meteor.users.findOne(userId);
    var activity = Activities.findOne(options.activityId);
    var group = Groups.findOne(activity.group);

    var commentorEmails = commentFollowerEmails(options.owner, options.activityId);
    
    var allEmails = _.union(groupMemberEmails(activity.groupId), commentorEmails);

    if(allEmails.length > 0) {
      var text  =  "Hey, " + displayName(commentor) + " just commented on a " + activity.type; 
      if(activity.type == "story") {
        text += " titled '" + activity.title + "'. ";
        text += "Check it out here: " + Meteor.absoluteUrl() + [group.slug, activity.slug].join("/") + "\n\n"
      } else if(activity.type == "short") {
        text += " for the group '" + group.name + "': " + Meteor.absoluteUrl() + group.slug + "\n\n"
      }

      text += "They said:\n\n" + options.comment + "\n\n";

      if(activity.type == "short")
        text += "To the post:\n\n" + activity.text + "\n\n";

      text += "Yours faithfully, Underplan"

      Email.send({
        from: "noreply@underplan.it",
        bcc: allEmails,
        replyTo: undefined,
        subject: "Underplan: New Comment for '" + group.name + "'",
        text: text
      });
    }
  }

  // Find all users following the group associated with this comment
  // who have also commented on the associated activity
  // Pass the owner of the comment so they can be excluded from the
  // notification and the activityId to find matching comments / owners
  var commentFollowerEmails = function(owner, activityId) {
    var commentorEmail = userEmail(Meteor.users.findOne({_id: owner}));
    var activity = Activities.findOne({_id: activityId});
    var commentorEmails = [];

    Comments.find({activityId: activityId}).forEach( function (comment) {
      var owner = Meteor.users.findOne({_id: comment.owner});
      commentorEmails.push(userEmail(owner));
    });

    var followerEmails = [];
    Meteor.users.find({}).forEach( function (user) {
      var following = user.profile.followedGroups;
      if(!!following && following[activity.group]) {
        followerEmails.push(userEmail(user));
      }
    });

    // Return the followers who have commented on the associated activity
    // minus the owner of the recent comment
    return _.without(_.intersection(commentorEmails, followerEmails), [commentorEmail]);
  };
}