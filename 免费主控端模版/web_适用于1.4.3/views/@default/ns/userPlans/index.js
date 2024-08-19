Tea.context(function () {
	this.createUserPlan = function () {
		teaweb.popup("/ns/userPlans/createPopup", {
			callback: function () {
				teaweb.successRefresh("保存成功")
			}
		})
	}

	this.updateUserPlan = function (userPlanId) {
		teaweb.popup("/ns/userPlans/userPlan/updatePopup?userPlanId=" + userPlanId, {
			callback: function () {
				teaweb.successRefresh("保存成功")
			}
		})
	}

	this.deleteUserPlan = function (userPlanId) {
		let that = this
		teaweb.confirm("确定要删除此套餐吗？", function () {
			that.$post("/ns/userPlans/userPlan/delete")
				.params({
					userPlanId: userPlanId
				})
				.success(function () {
					teaweb.successRefresh("删除成功")
				})
		})
	}
})