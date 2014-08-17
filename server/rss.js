RssFeed.publish('activities', function(query) {
  var _this = this,
      group = Groups.findOne({slug: query.group});

  if (!group) return

  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  _this.setValue('title', _this.cdata('Underplan.io'));
  _this.setValue('description', _this.cdata('This is a live feed'));
  _this.setValue('link', 'https://underplan.io/' + group.slug);
  _this.setValue('lastBuildDate', new Date());
  _this.setValue('pubDate', new Date());
  _this.setValue('ttl', 1);
  // managingEditor, webMaster, language, docs, generator

  Activities.find({}).forEach(function(activity) {
    var limit = 240,
        preview = activity.text.substring(0, limit);

    if(activity.text.length > limit)
      preview += "...";

    _this.addItem({
      guid: activity._id,
      title: activity.title || 'Shorty',
      description: preview,
      link: 'https://underplan.io/' + group.slug + '/' + activity._id,
      pubDate: activity.created
    });
  });

});