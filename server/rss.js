setValues = function (handler, settings) {
  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  _.forEach(settings, function (key, value) {
    handler.setValue(key, value);
  });

  handler.setValue('lastBuildDate', new Date());
  handler.setValue('pubDate', new Date());
  handler.setValue('ttl', 1);
  // managingEditor, webMaster, language, docs, generator
};

addComments = function (handler, activityIds) {
  // only return the comment _id for use in counts
  Comments.find({activityId: {$in: activityIds}}, {sort: {created: -1}}).forEach(function(comment) {
    var group = Groups.findOne({_id: comment.groupId}, {fields: {slug: 1}}),
        link;

    if (group) {
      link = 'https://underplan.io/' + group.slug + '/pl/' + comment.activityId;
    } else {
      link = 'https://underplan.io/';
    }

    handler.addItem({
      guid: comment._id,
      title: 'Comment by ' + displayName(Meteor.users.findOne({_id: comment.owner})),
      description: comment.comment,
      link: link,
      pubDate: comment.created
    });
  });
};

addActivities = function (handler, groupId, callback) {
  var activityConds = getActivityConditons(groupId);

  Activities.find(activityConds, {sort: {created: -1}}).forEach(function(activity) {
    var group = Groups.findOne({_id: activity.group}, {fields: {slug: 1}});

    var title = activity.title;
    if (!title && activity.location)
       title = activity.location;

    handler.addItem({
      guid: activity._id,
      title: title,
      description: activity.text,
      link: 'https://underplan.io/' + group.slug + '/pl/' + activity._id,
      pubDate: activity.created
    });

    if (typeof callback == 'function') {
      callback.call(this, activity._id);
    }
  });
};

RssFeed.publish('all', function(query) {
  var _this = this;

  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  _this.setValue('title', _this.cdata('Underplan: All'));
  _this.setValue('description', _this.cdata('Feed for all activities and comments'));
  _this.setValue('link', 'https://underplan.io/');
  _this.setValue('lastBuildDate', new Date());
  _this.setValue('pubDate', new Date());
  _this.setValue('ttl', 1);

  addActivities(_this, null, function (activityId) {
    addComments(_this, [activityId]);
  });
});

RssFeed.publish('activities', function(query) {
  var _this = this,
      group = Groups.findOne({slug: query.group});

  if (!group) return

  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  _this.setValue('title', _this.cdata('Underplan: ' + group.name));
  _this.setValue('description', _this.cdata(group.description));
  _this.setValue('link', 'https://underplan.io/' + group.slug);
  _this.setValue('lastBuildDate', new Date());
  _this.setValue('pubDate', new Date());
  _this.setValue('ttl', 1);

  addActivities(_this, group._id);
});

RssFeed.publish('comments', function(query) {
  var _this = this,
      group = Groups.findOne({slug: query.group});

  if (!group) return

  _this.setValue('title', _this.cdata('Underplan: ' + group.name));
  _this.setValue('description', _this.cdata('Comments for: ' + group.name));
  _this.setValue('link', 'https://underplan.io/' + group.slug);
  _this.setValue('lastBuildDate', new Date());
  _this.setValue('pubDate', new Date());
  _this.setValue('ttl', 1);

  var activityConds = getActivityConditons(group._id),
      activityOptions = {fields: {_id: 1}, sort: {created: -1}},
      activityIds = [];

  Activities.find(activityConds, activityOptions).forEach( function (activity) { 
    activityIds.push(activity._id);
  });

  addComments(_this, activityIds);
});