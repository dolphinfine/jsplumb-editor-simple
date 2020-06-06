/*
 * @Author: dolphin
 * @Date: 2020-06-06 10:33:25
 * @LastEditTime: 2020-06-06 12:37:24
 * @LastEditors: dolphin
 */

const clickoutsideContext = '@@clickoutsideContext';

export default {
  bind(el, binding, vnode) {
    const documentHandler = function(e) {
      if (!vnode.context || el.contains(e.target)) {
        return false;
      }
      if (binding.expression) {
        vnode.context[el[clickoutsideContext].methodName](e);
      } else {
        el[clickoutsideContext].bindingFn(e);
      }
    };
    el[clickoutsideContext] = {
      documentHandler,
      methodName: binding.expression,
      bindingFn: binding.value,
    };
    setTimeout(() => {
      document.addEventListener('click', documentHandler);
    }, 0);
  },
  update(el, binding) {
    el[clickoutsideContext].methodName = binding.expression;
    el[clickoutsideContext].bindingFn = binding.value;
  },
  unbind(el) {
    document.removeEventListener('click', el[clickoutsideContext].documentHandler);
  },
};
