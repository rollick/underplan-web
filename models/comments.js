
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
  update: function (userId, comments, fields, modifier) {
    return false; // no updates for now!
  },
  remove: function (userId, comment) {
    // deny if not the owner, or if other people are going
    return comment.owner === userId;
  }
});

Meteor.methods({
  // options should include: activityId, comment
  createComment: function (options) {
    options = options || {};
    if (typeof options.comment === "string" && options.comment.length > 1024 )
      throw new Meteor.Error(413, "Comment too long");
    if (! options.activityId )
      throw new Meteor.Error(413, "No associated activity");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    var comment = Comments.insert({
      owner:      this.userId,
      comment:    options.comment,
      activityId: options.activityId,
      created:    options.created
    });

    // Notify group members about new comment
    if (Meteor.isServer) {
      var commentor = Meteor.users.findOne(this.userId);
      var activity = Activities.findOne(options.activityId);
      var group = Groups.findOne(activity.group);
      var members = Meteor.users.find({$or: [{_id: {$in: group.invited}},
                                      {_id: group.owner}]});

      var memberEmails = [];
      members.forEach( function (user) { 
        var email = userEmail(user);
        if(email)
          memberEmails.push(email);
      });

      if(memberEmails.length > 0) {
        var text  =  "Hey, " + displayName(commentor) + " just commented on a " + activity.type; 
        if(activity.type == "story") {
          text += " titled '" + activity.title + "'. ";
          text += "Check it out here: " + Meteor.absoluteUrl() + [group.slug, activity.slug].join("/") + "\n\n"
        } else if(activity.type == "short") {
          text += " for the group '" + group.name + "'. ";
          text += "Check it out here: " + Meteor.absoluteUrl() + group.slug + "\n\n"
        }

        text += "They said:\n\n" + options.comment + "\n\n";
        text += "Yours faithfully, Underplan"

        Email.send({
          from: "noreply@underplan.it",
          bcc: memberEmails,
          replyTo: undefined,
          subject: "Underplan: New Comment for '" + group.name + "'",
          text: text
        });
      }
    }

    return comment;
  },
});