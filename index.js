var instance_skel = require('../../instance_skel');
var udp = require('../../udp');
var debug;
var log;

function instance(system, id, config) {
	let self = this;
	// super-constructor
	instance_skel.apply(this, arguments);
	self.actions(); // export actions
	return self;
}

instance.prototype.PLAYBACK_COUNT = 64;

instance.prototype.localVariables = [];

instance.prototype.TIMER = null;
instance.prototype.TIMER_RATE = 1000;

instance.prototype.init = function() {
	let self = this;
	self.status(self.STATE_OK);
	debug = self.debug;
	log = self.log;
	self.init_variables();
	self.init_feedbacks();
	self.init_presets();
	self.init_udp();
	self.init_timer();
};

instance.prototype.updateConfig = function(config) {
	let self = this;

	self.config = config;
	self.status(self.STATE_OK);
	self.init_variables();
	self.init_feedbacks();
	self.init_presets();
	self.init_udp();
	self.init_timer();
};

//init_variables: establish instance dynamic variables for button display and other purposes
instance.prototype.init_variables = function() {
	let self = this;

	let variables = [];
	
	for (let i = 1; i <= self.PLAYBACK_COUNT; i++) {
		variables.push({ name: 'playback_intensity_' + i, label: 'Playback ' + i + ' Intensity' });
		variables.push({ name: 'playback_speed_' + i, label: 'Playback ' + i + ' Speed' });
		variables.push({ name: 'playback_button_' + i, label: 'Playback ' + i + ' Button' });
		variables.push({ name: 'playback_active_' + i, label: 'Playback ' + i + ' Active' });
		variables.push({ name: 'playback_cue_' + i, label: 'Playback ' + i + ' Cue' });
	}
	
	variables.push({ name: 'blackout_mode', label: 'Blackout Mode' });

	self.setVariableDefinitions(variables);
	self.localVariables = variables; //copies variable definitions for local instance use

	self.updateVariable('blackout_mode', '');

	for (let i = 1; i <= self.PLAYBACK_COUNT; i++) {
		self.updateVariable('playback_intensity_' + i, '');
		self.updateVariable('playback_speed_' + i, '');
		self.updateVariable('playback_button_' + i, '');
		self.updateVariable('playback_active_' + i, '');
		self.updateVariable('playback_cue_' + i, '');
	}
};

//updateVariable: updates both the system instance variable and local variable for button display and feedback purposes
instance.prototype.updateVariable = function (variableName, value) {
	let self = this;
	
	self.setVariable(variableName, value);
	self.localVariables[variableName] = value;
};

instance.prototype.init_feedbacks = function() {
	let self = this;

	let feedbacks = {};

	let playbackList = [];
	
	for (let i = 1; i <= self.PLAYBACK_COUNT; i++) {
		let playbackListObj = {};
		playbackListObj.id = i;
		playbackListObj.label = 'Playback ' + i;
		playbackList.push(playbackListObj);
	}

	feedbacks['blackout_mode'] = {
		label: 'Blackout is On',
		description: 'If in blackout mode, color the button',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(100,255,0)
			}
		],
		callback: (feedback, bank) => {
			if (self.localVariables['blackout_mode'].toString() === 'true') {
				return {
					color: feedback.options.fg,
					bgcolor: feedback.options.bg
				};
			}
		}
	};
	
	feedbacks['playback_button'] = {
		label: 'Playback Button is pressed',
		description: 'If the playback button is pressed, change the color of the button.',
		options: [
			{
				type: 'number',
				label: 'Playback Index',
				id: 'index',
				min: 1,
				max: self.PLAYBACK_COUNT,
				default: 1,
				step: 1,
				required: true,
				range: false
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(125,125,125)
			}
		],
		callback: (feedback, bank) => {
			if (self.localVariables['playback_button_' + feedback.options.index].toString() === 'true') {
				return {
					color: feedback.options.fg,
					bgcolor: feedback.options.bg
				};
			}
		}
	};

	feedbacks['playback_active'] = {
		label: 'Playback is Active',
		description: 'If the playback is active, change the color of the button.',
		options: [
			{
				type: 'number',
				label: 'Playback Index',
				id: 'index',
				min: 1,
				max: self.PLAYBACK_COUNT,
				default: 1,
				step: 1,
				required: true,
				range: false
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(219, 126, 68)
			}
		],
		callback: (feedback, bank) => {
			if (self.localVariables['playback_active_' + feedback.options.index].toString() === 'true') {
				return {
					color: feedback.options.fg,
					bgcolor: feedback.options.bg
				};
			}
		}
	};

	self.setFeedbackDefinitions(feedbacks);
};

instance.prototype.init_presets = function () {
	let self = this;

	let presets = [];

	//Blackout
	presets.push({
		category: 'Blackout',
		label: 'Toggle Blackout Mode On/Off',
		bank: {
			style: 'text',
			text: `Blackout`,
			size: '14',
			color: '16777215',
			bgcolor: self.rgb(0, 0, 0)
		},
		actions: [{
			action: 'toggle_blackout'
		}],
		feedbacks: [
			{
				type: 'blackout_mode'
			}
		]
	});

	//Playback Go, Intensity, Speed
	for (let i = 1; i <= self.PLAYBACK_COUNT; i++) {
		presets.push({
			category: `Playback ${i}`,
			label: 'GO/STOP' + i,
			bank: {
				style: 'text',
				text: `Playback ${i}\\nGO/STOP\\nCue: $(cuety:playback_cue_${i})`,
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [{
				action: 'control_playback_button_on',
				options:{
					index: i
				}
			}],
			release_actions: [{
				action: 'control_playback_button_off',
				options:{
					index: i
				}
			}],
			feedbacks: [
				{
					type: 'playback_button',
					options: {
						index: i
					}
				},
				{
					type: 'playback_active',
					options: {
						index: i
					}
				}
			]
		});

		presets.push({
			category: `Playback ${i}`,
			label: 'Increment Playback Intensity ' + i,
			bank: {
				style: 'text',
				text: `PB ${i}:\\nInc Intensity:\\n$(cuety:playback_intensity_${i})`,
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [{
				action: 'increment_intensity',
				options:{
					index: i,
					intensity: 10
				}
			}],
			feedbacks: [
				{
					type: 'playback_active',
					options: {
						index: i
					}
				}
			]
		});

		presets.push({
			category: `Playback ${i}`,
			label: 'Decrement Playback Intensity ' + i,
			bank: {
				style: 'text',
				text: `PB ${i}:\\nDec Intensity:\\n$(cuety:playback_intensity_${i})`,
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [{
				action: 'decrement_intensity',
				options:{
					index: i,
					intensity: 10
				}
			}],
			feedbacks: [
				{
					type: 'playback_active',
					options: {
						index: i
					}
				}
			]
		});

		presets.push({
			category: `Playback ${i}`,
			label: 'Increment Playback Speed ' + i,
			bank: {
				style: 'text',
				text: `PB ${i}:\\nInc Speed:\\n$(cuety:playback_speed_${i})`,
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [{
				action: 'increment_speed',
				options:{
					index: i,
					intensity: 1
				}
			}],
			feedbacks: [
				{
					type: 'playback_active',
					options: {
						index: i
					}
				}
			]
		});

		presets.push({
			category: `Playback ${i}`,
			label: 'Decrement Playback Speed ' + i,
			bank: {
				style: 'text',
				text: `PB ${i}:\\nDec Speed:\\n$(cuety:playback_speed_${i})`,
				size: '14',
				color: '16777215',
				bgcolor: self.rgb(0, 0, 0)
			},
			actions: [{
				action: 'decrement_speed',
				options:{
					index: i,
					intensity: 1
				}
			}],
			feedbacks: [
				{
					type: 'playback_active',
					options: {
						index: i
					}
				}
			]
		});
	}

	self.setPresetDefinitions(presets);
}

instance.prototype.init_udp = function() {
	let self = this;

	if (self.config.host !== undefined) {
		self.udp = new udp(self.config.host, self.config.port);

		self.udp.on('status_change', function (status, message) {
			self.status(status, message);
		});

		self.udp.on('data', function (data) {
			self.checkResponse(data.toString());
		});

		self.udp.send('hello');
		self.udp.send('pbxx/int'); //get all intensities
		self.udp.send('pbxx/spd'); //get all speeds
		self.udp.send('pbxx/cue'); //get all active cues
		self.udp.send('pbxx/ac'); //get all playback status
	}
};

instance.prototype.init_timer = function() {
	let self = this;

	if (self.config.poll) {
		if (self.TIMER !== null) {
			clearInterval(self.TIMER);
			self.TIMER = null;
		}
	
		self.TIMER = setInterval(self.checkForData.bind(self), self.TIMER_RATE);
	}
};

instance.prototype.checkForData = function() {
	let self = this;

	if (self.udp) {
		self.udp.send('pbxx/int'); //get all intensities
		self.udp.send('pbxx/spd'); //get all speeds
		self.udp.send('pbxx/cue'); //get all active cues
		self.udp.send('pbxx/ac'); //get all playback status
	}
};

instance.prototype.checkResponse = function(message) {
	let self = this;

	try {
		if (message.indexOf('blackout') > -1) {
			let value = parseInt(message.split('=')[1].toString());
			self.updateVariable('blackout_mode', !!value);
			self.checkFeedbacks('blackout_mode');
		}
		else if (message.indexOf('pb') > -1) {
			//a playback message
			let msg = message.split('/');
			let playbackIndex = msg[0].replace('pb', '');
			let value = msg[1].split('=');
			let type = value[0];
	
			if (type === 'in') {
				self.updateVariable('playback_intensity_' + parseInt(playbackIndex), value[1]);
			}
			else if (type === 'sp') {
				self.updateVariable('playback_speed_' + parseInt(playbackIndex), value[1]);
			}
			else if (type === 'bu') {
				let boolValue = parseInt(value[1]);
				self.updateVariable('playback_button_' + parseInt(playbackIndex), !!boolValue);
				self.checkFeedbacks('playback_button');
				self.checkFeedbacks('playback_active');
			}
			else if (type === 'ac') {
				let boolValue = parseInt(value[1]);
				self.updateVariable('playback_active_' + parseInt(playbackIndex), !!boolValue);
				self.checkFeedbacks('playback_active');
			}
			else if (type === 'cue') {
				self.updateVariable('playback_cue_' + parseInt(playbackIndex), value[1]);
			}
			else if (type === 'all') {
				let all_type = msg[2].split('=')[0];
				let arr = msg[2].split('=')[1].replace('[','').replace(']','').split(',');
	
				for (let i = 0; i < arr.length; i++) {
					if (all_type === 'intensity') {
						self.updateVariable('playback_intensity_' + (i+1), arr[i]);
					}
					else if (all_type === 'speed') {
						self.updateVariable('playback_speed_' + + (i+1), arr[i]);
					}
					else if (all_type === 'bu') {
						self.updateVariable('playback_button_' + + (i+1), arr[i]);
						self.checkFeedbacks('playback_button');
						self.checkFeedbacks('playback_active');
					}
					else if (all_type === 'ac') {
						let boolValue = parseInt(arr[i]);
						self.updateVariable('playback_active_' + + (i+1), !!boolValue);
						self.checkFeedbacks('playback_active');
					}
					else if (all_type === 'cue') {
						self.updateVariable('playback_cue_' + + (i+1), arr[i]);
					}
				}
			}
		}
	}
	catch(error) {
		console.log('Unexpected response in data: ' + error);
	}	
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	let self = this;

	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'Target Port',
			width: 4,
			default: '7000',
			regex: self.REGEX_PORT
		},
		{
			type: 'checkbox',
			label: 'Poll for active cue and other updates',
			id: 'poll',
			default: true,
			tooltip: 'If selected, the module will send a request for update every second.'
		},
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	let self = this;

	if (self.udp !== undefined) {
		self.udp.destroy();
	}

	if (self.TIMER !== null) {
		clearInterval(self.TIMER);
		self.TIMER = null;
	}

	debug("destroy", self.id);
};

instance.prototype.actions = function(system) {
	let self = this;

	self.system.emit('instance_actions', self.id, {

		'set_intensity': {
			label: 'Set Playback Intensity',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Intensity',
					id: 'intensity',
					min: 1,
					max: 100,
					default: 50,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'increment_intensity': {
			label: 'Increment Playback Intensity',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Intensity Increment Amount',
					id: 'intensity',
					min: -100,
					max: 100,
					default: 10,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'decrement_intensity': {
			label: 'Decrement Playback Intensity',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Intensity Decrement Amount',
					id: 'intensity',
					min: -100,
					max: 100,
					default: 10,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'set_speed': {
			label: 'Set Playback Speed',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Speed',
					id: 'speed',
					min: -100,
					max: 100,
					default: 10,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'increment_speed': {
			label: 'Increment Playback Speed',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Increment Speed',
					id: 'speed',
					min: -100,
					max: 100,
					default: 10,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'decrement_speed': {
			label: 'Decrement Playback Speed',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Decrement Speed',
					id: 'speed',
					min: -100,
					max: 100,
					default: 10,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'control_playback_button_on': {
			label: 'Control Playback Button On',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'control_playback_button_off': {
			label: 'Control Playback Button Off',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'control_playback_go': {
			label: 'Control Playback Button (Go)',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'control_playback_release': {
			label: 'Control Playback Button (Release)',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'control_playback_flash': {
			label: 'Control Playback Flash',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'release_playback': {
			label: 'Release Playback',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'playback_goforward': {
			label: 'Playback Go Forward',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'playback_goback': {
			label: 'Playback Go Back',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				}
			]
		},
		'playback_jump': {
			label: 'Playback Jump',
			options: [
				{
					type: 'number',
					label: 'Playback Index',
					id: 'index',
					min: 1,
					max: self.PLAYBACK_COUNT,
					default: 1,
					step: 1,
					required: true,
					range: false
				},
				{
					type: 'number',
					label: 'Value',
					id: 'value',
					min: 1,
					max: 48,
					default: 1,
					step: 1,
					required: true,
					range: true
				}
			]
		},
		'set_all_intensity': {
			label: 'Set All Intensity',
			options: [
				{
					type: 'number',
					label: 'Intensity',
					id: 'intensity',
					min: 0.0,
					max: 1.0,
					default: 1.0,
					step: 0.1,
					required: true,
					range: true
				}
			]
		},
		'set_all_speed': {
			label: 'Set All Speed',
			options: [
				{
					type: 'number',
					label: 'Speed',
					id: 'speed',
					min: -1.0,
					max: 1.0,
					default: 0.0,
					step: 0.1,
					required: true,
					range: true
				}
			]
		},
		'release_all': {
			label: 'Release All Playbacks'
		},
		'set_blackout': {
			label: 'Set Blackout On/Off',
			options: [
				{
					type: 'dropdown',
					label: 'On/Off',
					id: 'blackout',
					default: '1',
					choices: [
						{ id: '0', label: 'Off' },
						{ id: '1', label: 'On' }
					],
					minChoicesForSearch: 0
				}
			]
		},
		'toggle_blackout': {
			label: 'Toggle Blackout On/Off'
		},
	});
};

instance.prototype.action = function(action) {
	let self = this;

	let cmd;
	let opt = action.options;

	switch (action.action) {
		case 'set_intensity':
			cmd = 'pb' + self.padIndex(opt.index) + '/in=' + opt.intensity;
			break;
		case 'increment_intensity':
			cmd = 'pb' + self.padIndex(opt.index) + '/in=++' + opt.intensity;
			break;
		case 'decrement_intensity':
			cmd = 'pb' + self.padIndex(opt.index) + '/in=--' + opt.intensity;
			break;
		case 'set_speed':
			cmd = 'pb' + self.padIndex(opt.index) + '/sp=' + opt.speed;
			break;
		case 'increment_speed':
			cmd = 'pb' + self.padIndex(opt.index) + '/sp=++' + opt.speed;
			break;
		case 'decrement_speed':
			cmd = 'pb' + self.padIndex(opt.index) + '/sp=--' + opt.speed;
			break;
		case 'control_playback_button_on':
			cmd = 'pb' + opt.index + '/bu=1';
			break;
		case 'control_playback_button_off':
			cmd = 'pb' + opt.index + '/bu=0';
			break;	
		case 'control_playback_go':
			self.controlPlayback(self.padIndex(opt.index), 'go');
			setTimeout(self.controlPlayback.bind(self), 500, self.padIndex(opt.index), 'release');
			break;
		case 'control_playback_release':
			self.controlPlayback(self.padIndex(opt.index), 'go');
			setTimeout(self.controlPlayback.bind(self), 1000, self.padIndex(opt.index), 'release');
			break;
		case 'control_playback_flash':
			cmd = 'pb' + self.padIndex(opt.index) + '/fl';
			break;
		case 'release_playback':
			cmd = 'pb' + self.padIndex(opt.index) + '/re';
			break;
		case 'playback_goforward':
			cmd = 'pb' + self.padIndex(opt.index) + '/go+';
			break;
		case 'playback_goback':
			cmd = 'pb' + self.padIndex(opt.index) + '/go-';
			break;
		case 'playback_jump':
			cmd = 'pb' + self.padIndex(opt.index) + '/ju=' + opt.value;
			break;
		case 'set_all_intensity':
			cmd = 'pbxx/int=' + opt.intensity;
			break;
		case 'set_all_speed':
			cmd = 'pbxx/spd=' + opt.speed;
			break;
		case 'release_all':
			cmd = 'release';
			break;
		case 'set_blackout':
			cmd = 'blackout=' + opt.blackout;
			break;
		case 'toggle_blackout':
			let blackout_mode = self.localVariables['blackout_mode'].toString();
			if (blackout_mode === 'true') {
				cmd = 'blackout=0'; //turn it off
			}
			else {
				cmd = 'blackout=1'; //turn it on
			}
			break;
	}

	if (cmd !== undefined) {
		debug("Sending ", cmd, "to", self.config.host);

		if (self.udp !== undefined) {
			self.udp.send(cmd);
		}
	}
};

instance.prototype.padIndex = function(index) {
	if (index < 10) {
		return '0' + index;
	}
	else {
		return '' + index;
	}
};

instance.prototype.controlPlayback = function(index, command) {
	let self = this;

	let cmd = 'pb' + index + '/bu=';

	if (command === 'go') {
		cmd += '1';
	}
	else {
		cmd += '0';
	}

	if (cmd !== undefined) {
		debug("Sending ", cmd, "to", self.config.host);

		if (self.udp !== undefined) {
			self.udp.send(cmd);
		}
	}
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;
