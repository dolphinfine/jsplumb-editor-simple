
import Vue from 'vue'
import {
  Button, Row,
  Col, Form,
  FormItem,
  Input,
  Drawer,
  Card,
  MessageBox,
  Message
} from 'element-ui'

Vue.use(Row)
Vue.use(Col)
Vue.use(Form)
Vue.use(Button)
Vue.use(FormItem)
Vue.use(Input)
Vue.use(Drawer)
Vue.use(Card)
Vue.prototype.$confirm = MessageBox.confirm;
Vue.prototype.$message = Message;
