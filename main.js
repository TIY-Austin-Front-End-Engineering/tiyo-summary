(function() {
	var assignments = {};
	var matches = null;

	if(window.location.hostname !== 'online.theironyard.com') {
		alert('This bookmarklet must be run from TIYO');
	}
	else if(!(matches = window.location.pathname.match(/\/admin\/paths\/([0-9]+)/))) {
		alert('Please go to the path that you\'d like to summarize.');
	}
	else {
		var $loading = $('<div />', {text: 'Loading...'});
		$loading.css({
			background: '#000',
			color: '#fff',
			opacity: 0.7,
			position: 'fixed',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			zIndex: 100000,
			fontWeight: 'bold',
			fontSize: '30px',
			textAlign: 'center',
			paddingTop: '10em',
			boxSizing: 'border-box'

		})
		$('body').append($loading);
		var promises = $('.path-tree-level.assignment').map(function(index, el) {
			var def = $.Deferred();
			var assignmentPath = $(el).find('.text-body').attr('href');
			assignments[assignmentPath] = {
				due: null,
				hidden: false,
				students: {}
			};
			if(assignmentPath) {
				$.get(assignmentPath)
				.then(parseAssignmentBody.bind(assignments[assignmentPath]))
				.done(def.resolve)
				.fail(def.reject);
			}
			else {
				def.reject('couldn\'t find path for '+index);
			}
			return def.promise();
		});
		
		$.when.apply($, promises)
		.done(function() {
			$loading.remove();
			var $table = $('#grade-summary');
			if(!$table.length) {
				$table = $('<table />', {class: 'table', id: 'grade-summary'});
			}
			$table.children().remove();
			$table.append(
				$('<thead />').append(
					$('<tr />').append(
						$('<th />', {text: 'Student'}),
						$('<th />', {text: 'Grades'})
					)
				)
			);
			var $tbody = $('<tbody />');
			var students = {};
			for(var i in assignments) {
				var assignment = assignments[i];
				for(var name in assignment.students) {
					if(!students.hasOwnProperty(name)) {
						students[name] = {
							name: name,
							assignments: []
						}
					}
					students[name].assignments.push({
						name: i,
						grade: assignment.students[name],
						due: assignment.due,
						hidden: assignment.hidden
					});
				}
			}
			for(var i in students) {
				var $tr = $('<tr />');
				var $name = $('<td />', {text: students[i].name});
				var $grades = $('<td />');
				students[i].assignments
				.sort(function(a, b) {
					var diff = a.due.getTime() - b.due.getTime();
					if(!diff) {
						var piecesa = a.name.split('/');
						var piecesb = b.name.split('/');
						return piecesb.pop() - piecesa.pop();
					}
					return diff;
				})
				.filter(function(assignment) {
					return !assignment.hidden && !isNaN(assignment.due.getTime()) && assignment.due.getTime() <= Date.now();
				})
				.forEach(function(assignment) {
					$grades.append(getGradeElement(assignment));
				});
				
				$tr.append($name).append($grades);
				$tbody.append($tr);
			}
			$table.append($tbody);
			$table.insertBefore('.path-tree-container');
		});
	}

	function getGradeElement(assignment) {
		var grades = {
			'NOT SUBMITTED': {
				label: 'NoS',
				color: 'red',
				bold: false
			},
			'INCOMPLETE': {
				label: 'Inc',
				color: 'orange',
				bold: false
			},
			'NOT GRADED': {
				label: 'NoG',
				color: 'black',
				bold: false
			},
			'COMPLETE AND UNSATISFACTORY': {
				label: 'C&U',
				color: 'orange',
				bold: false
			},
			'COMPLETE AND SATISFACTORY': {
				label: 'C&S',
				color: 'green',
				bold: false
			},
			'EXCEEDS EXPECTATIONS': {
				label: 'ExE',
				color: 'green',
				bold: true
			}
		}
		if(!grades.hasOwnProperty(assignment.grade.toUpperCase())) {
			return console.warn('Unknown grade: '+assignment.grade);
		}
		var gradeSettings = grades[assignment.grade.toUpperCase()];
		var $el = $('<a />', {
			text: gradeSettings.label,
			href: assignment.name,
			target: '_blank'
		});
		$el.css({
			display: 'inline-block',
			color: gradeSettings.color,
			fontWeight: gradeSettings.bold ? 'bold' : 'normal',
			fontFamily: 'Courier New',
			marginRight: '6px',
			textDecoration: 'none'
		});
		return $el;

	}

	function parseAssignmentBody(body) {
		var self = this;
		var def = $.Deferred();

		var $body = $(body);
		var $students = $body.find('#submissions tr');
		var $hidden = $body.find('#hidden-state');
		var students = Array.prototype.slice.call($students, 0);
		students.shift(); // Remove heading
		self.hidden = $hidden.is(':checked');
		for(var i=0; i<students.length; i++) {
			var student = students[i];
			var pieces = $(student).find('td');
			self.students[$.trim(pieces.eq(0).html())] = $.trim(pieces.eq(1).text());
		}

		var $viewAsStudent = $body.find('a.btn.btn-secondary.btn-sm:contains("View Assignment as Student")');
		$.get($viewAsStudent.attr('href'))
		.done(function(asStudentBody) {
			var $asStudentBody = $(asStudentBody);
			var $dueDate = $asStudentBody.find('.m-full-page-heading-info-meta .m-full-page-heading-info-date');
			self.due = new Date($.trim($dueDate.text()).substr(4));
			def.resolve();
		})
		.fail(def.reject);

		return def.promise();
	}

})();