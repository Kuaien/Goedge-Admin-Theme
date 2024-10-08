Tea.context(function () {
	this.moreOptionsVisible = false
	this.globalMessageBadge = 0

	if (typeof this.leftMenuItemIsDisabled == "undefined") {
		this.leftMenuItemIsDisabled = false
	}

	this.$delay(function () {
		if (this.$refs.focus != null) {
			this.$refs.focus.focus()
		}

		if (!window.IS_POPUP) {
			// 检查消息
			this.checkMessages()

			// 检查集群节点同步
			this.loadNodeTasks();

			// 检查DNS同步
			this.loadDNSTasks()
		}
	})
	
	this.menuShow = true
	this.changeMenus = function () {
		this.menuShow = !this.menuShow
	}
	
	let notes = localStorage.getItem('notes');
	if(notes){
		this.notesText = notes;
	}else{
		this.notesText = "便签中的内容会存储在本地，这样即便你关掉了浏览器，在下次打开时依然会读取到上一次的记录。是个非常小巧实用的本地备忘录";
	}
	this.notesShow = false;
	this.openNotes = function(status){
		this.notesShow = status;
	}
	this.handleNotes = function(){
		localStorage.setItem('notes', this.notesText);
	}
	Vue.directive('draggable', {
		bind: function (el, binding, vnode) {
			var isDragging = false;
			var offsetX = 0;
			var offsetY = 0;
			el.addEventListener('mousedown', function (event) {
				if (event.target.tagName.toLowerCase() === 'textarea') {
					return;
				}
				isDragging = true;
				offsetX = event.clientX - el.offsetLeft;
				offsetY = event.clientY - el.offsetTop;
			});
			document.addEventListener('mousemove', function (event) {
				if (isDragging) {
					var left = event.clientX - offsetX;
					var top = event.clientY - offsetY;
	
					el.style.left = left + 'px';
					el.style.top = top + 'px';
	
					vnode.context.left = left;
					vnode.context.top = top;
				}
			});
			document.addEventListener('mouseup', function (event) {
				isDragging = false;
			});
		}
	})
	
	/**
	 * 切换模板
	 */
	this.changeTheme = function () {
		this.$post("/ui/theme").success(function (resp) {
			teaweb.successToast("界面风格已切换")
			this.teaTheme = resp.data.theme
			this.changeColor(resp.data.theme)
		})
	}

	this.changeColor = function (name){
		let colors = {
			"theme1": {
				"color1": '#6d4aff',
				"color2": '#8a6eff',
				"color3": '#573bcc',
				"color4": '#1c1240',
			},
			"theme2": {
				"color1": '#0558fb',
				"color2": '#0a6bff',
				"color3": '#0b44c2',
				"color4": '#0f275c',
			},
			"theme3": {
				"color1": '#0693f1',
				"color2": '#3db2ff',
				"color3": '#005ca7',
				"color4": '#06294b',
			},
			"theme4": {
				"color1": '#059212',
				"color2": '#01b810',
				"color3": '#0a7114',
				"color4": '#003406',
			},
			"theme5": {
				"color1": '#f900bf',
				"color2": '#ff58ed',
				"color3": '#b80083',
				"color4": '#5f0040',
			},
			"theme6": {
				"color1": '#fc4100',
				"color2": '#ff5c0a',
				"color3": '#cc2c02',
				"color4": '#460c04',
			},
			"theme7": {
				"color1": '#c87617',
				"color2": '#e2991e',
				"color3": '#a65517',
				"color4": '#401c08',
			},
		}
		color = colors[name]
		teaweb.DefaultChartColor = color.color2
		localStorage.setItem('theme', JSON.stringify(color));
		let style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = `:root{--color1: ${color.color1};--color2: ${color.color2};--color3: ${color.color3};--color4: ${color.color4};}`
		document.getElementsByTagName('head')[0].appendChild(style);
	}
	this.changeColor(this.teaTheme||'theme1')

	/**
	 * 左侧子菜单
	 */
	this.showSubMenu = function (menu) {
		if (menu.alwaysActive) {
			return
		}
		if (this.teaSubMenus.menus != null && this.teaSubMenus.menus.length > 0) {
			this.teaSubMenus.menus.$each(function (k, v) {
				if (menu.id == v.id) {
					return
				}
				v.isActive = false
			})
		}
		menu.isActive = !menu.isActive
	};

	/**
	 * 检查消息
	 */
	this.checkMessages = function () {
		this.$post("/messages/badge")
			.params({})
			.success(function (resp) {
				this.globalMessageBadge = resp.data.count

				// add dot to title
				let dots = "••• "
				if (typeof document.title == "string") {
					if (resp.data.count > 0) {
						if (!document.title.startsWith(dots)) {
							document.title = dots + document.title
						}
					} else if (document.title.startsWith(dots)) {
						document.title = document.title.substring(dots.length)
					}
				}
			})
			.done(function () {
				let delay = 6000
				if (this.globalMessageBadge > 0) {
					delay = 30000
				}
				this.$delay(function () {
					this.checkMessages()
				}, delay)
			})
	}

	this.checkMessagesOnce = function () {
		this.$post("/messages/badge")
			.params({})
			.success(function (resp) {
				this.globalMessageBadge = resp.data.count
			})
	}

	this.showMessages = function () {
		teaweb.popup("/messages", {
			height: "28em",
			width: "50em"
		})
	}

	/**
	 * 底部伸展框
	 */
	this.showQQGroupQrcode = function () {
		teaweb.popup("/about/qq", {
			width: "21em",
			height: "30em"
		})
	}

	/**
	 * 弹窗中默认成功回调
	 */
	if (window.IS_POPUP === true) {
		this.success = window.NotifyPopup
	}

	/**
	 * 节点同步任务
	 */
	this.doingNodeTasks = {
		isDoing: false,
		hasError: false,
		isUpdated: false
	}

	this.loadNodeTasks = function () {
		if (!Tea.Vue.teaCheckNodeTasks) {
			return
		}
		let isStream = false
		this.$post("/clusters/tasks/check")
			.params({
				isDoing: this.doingNodeTasks.isDoing ? 1 : 0,
				hasError: this.doingNodeTasks.hasError ? 1 : 0,
				isUpdated: this.doingNodeTasks.isUpdated ? 1 : 0
			})
			.timeout(60)
			.success(function (resp) {
				this.doingNodeTasks.isDoing = resp.data.isDoing
				this.doingNodeTasks.hasError = resp.data.hasError
				this.doingNodeTasks.isUpdated = true
				isStream = resp.data.shouldWait
			})
			.done(function () {
				this.$delay(function () {
					this.loadNodeTasks()
				}, isStream ? 5000 : 30000)
			})
	}

	this.showNodeTasks = function () {
		teaweb.popup("/clusters/tasks/listPopup", {
			height: "28em",
			width: "54em"
		})
	}

	/**
	 * DNS同步任务
	 */
	this.doingDNSTasks = {
		isDoing: false,
		hasError: false,
		isUpdated: false
	}

	this.loadDNSTasks = function () {
		if (!Tea.Vue.teaCheckDNSTasks) {
			return
		}
		let isStream = false
		this.$post("/dns/tasks/check")
			.params({
				isDoing: this.doingDNSTasks.isDoing ? 1 : 0,
				hasError: this.doingDNSTasks.hasError ? 1 : 0,
				isUpdated: this.doingDNSTasks.isUpdated ? 1 : 0
			})
			.timeout(60)
			.success(function (resp) {
				this.doingDNSTasks.isDoing = resp.data.isDoing
				this.doingDNSTasks.hasError = resp.data.hasError
				this.doingDNSTasks.isUpdated = true
				isStream = resp.data.isStream
			})
			.done(function () {
				this.$delay(function () {
					this.loadDNSTasks()
				}, isStream ? 5000 : 30000)
			})
	}

	this.showDNSTasks = function () {
		teaweb.popup("/dns/tasks/listPopup", {
			height: "28em",
			width: "54em"
		})
	}

	this.LANG = function (code) {
		if (window.LANG_MESSAGES != null) {
			let message = window.LANG_MESSAGES[code]
			if (typeof message == "string") {
				return message
			}
		}
		if (window.LANG_MESSAGES_BASE != null) {
			let message = window.LANG_MESSAGES_BASE[code]
			if (typeof message == "string") {
				return message
			}
		}
		return "{{ LANG('" + code + "') }}"
	}

	this.switchLang = function () {
		this.$post("/settings/lang/switch")
			.success(function () {
				window.location.reload()
			})
	}
});

window.NotifySuccess = function (message, url, params) {
	if (typeof (url) == "string" && url.length > 0) {
		if (url[0] != "/") {
			url = Tea.url(url, params);
		}
	}
	return function () {
		teaweb.success(message, function () {
			window.location = url;
		});
	};
};

window.NotifyReloadSuccess = function (message) {
	return function () {
		teaweb.success(message, function () {
			window.location.reload()
		})
	}
}

window.NotifyDelete = function (message, url, params) {
	teaweb.confirm(message, function () {
		Tea.Vue.$post(url)
			.params(params)
			.refresh();
	});
};

window.NotifyPopup = function (resp) {
	window.parent.teaweb.popupFinish(resp);
};

window.ChangePageSize = function (size) {
	let url = window.location.toString();
	url = url.replace(/page=\d+/g, "page=1")
	if (url.indexOf("pageSize") > 0) {
		url = url.replace(/pageSize=\d+/g, "pageSize=" + size)
	} else {
		if (url.indexOf("?") > 0) {
			let anchorIndex = url.indexOf("#")
			if (anchorIndex < 0) {
				url += "&pageSize=" + size;
			} else {
				url = url.substring(0, anchorIndex) + "&pageSize=" + size + url.substr(anchorIndex);
			}
		} else {
			url += "?pageSize=" + size;
		}
	}
	window.location = url;
};