
<template>
  <div class="workflow" @contextmenu="hiddenRightMenu">
    <!-- 参数配置 -->
    <el-card>
      <div class="text-align-right" slot="header">
        <el-button
          type="text"
          icon="el-icon-zoom-out"
          title="缩小"
          class="margin-right-20"
          @click="zoomOut"
        ></el-button>

        <el-button
          type="text"
          icon="el-icon-zoom-in"
          title="放大"
          class="margin-right-20"
          @click="zoomIn"
        ></el-button>
      </div>
      <div class="drag-box border" id="drag">
        <!-- 即将被拖拽的节点 -->
        <ul class="sidebar drag-ul text-align-center font-12">
          <li class="drag-item" title="节点一">
            <i class="iconfont icon-shujucaiji font-30 color-primary"></i>
            <p>节点一</p>
          </li>
          <li class="drag-item" title="节点二">
            <i class="iconfont icon-shujutuisong font-30 color-primary"></i>
            <p>节点二</p>
          </li>
          <li class="drag-item" title="节点三">
            <i class="iconfont icon-shujuchuli font-30 color-primary"></i>
            <p>节点三</p>
          </li>
          <li class="drag-item" title="节点四">
            <i class="iconfont icon-shujuzhiliang font-30 color-primary"></i>
            <p>节点四</p>
          </li>
        </ul>
        <!-- 主要画布 -->
        <section class="drop" @contextmenu="canvasRightClick">
          <div id="canvas" class="canvas">
            <!-- 节点菜单 -->
            <ul
              class="right-menu bg-white border font-12"
              :style="{left:`${contextMenuPosition[0]}px`,top:`${contextMenuPosition[1]}px`}"
            >
              <template v-if="deleteTarget.type==='node'">
                <li @click="editNode">
                  <i class="el-icon-edit margin-right-5 color-success"></i>
                  编辑
                </li>
                <li @click="copyNode">
                  <i class="el-icon-document-copy margin-right-5 color-warning"></i>
                  复制
                </li>
              </template>
              <li @click="delElement">
                <i class="el-icon-delete margin-right-5 color-warning"></i>
                删除
              </li>
            </ul>

            <div
              v-for="node in nodes"
              :key="node.nodeId"
              :id="node.nodeId"
              class="node text-align-center"
              :style="{left:`${node.position.x}px`,top:`${node.position.y}px`}"
              v-clickoutside="hiddenRightMenu"
              @contextmenu.prevent.stop="rightClick(node,$event)"
            >
              <div class="padding-5" style="border-radius:5px;">
                <i class="iconfont inline-block vertical-align-middle color-primary margin-right-5"></i>
                <span
                  class="node-name font-12 inline-block not-wrap vertical-align-middle"
                  :title="node.nodeName"
                >{{node.nodeName}}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </el-card>

    <!-- 右侧节点配置 -->
    <el-drawer title="节点配置" :visible.sync="isShowDrawer" direction="rtl" ref="drawer">
      <div class="demo-drawer__content padding-20">
        <el-form :model="nodeForm" ref="nodeForm" label-width="120px">
          <el-form-item label="节点名称" prop="nodeName">
            <el-input maxlength="50" show-word-limit v-model="nodeForm.nodeName"></el-input>
          </el-form-item>
          <el-form-item label="节点描述" prop="desc">
            <el-input maxlength="50" show-word-limit v-model="nodeForm.desc" type="textarea"></el-input>
          </el-form-item>
        </el-form>
        <div class>
          <el-button @click="isShowDrawer = false">取 消</el-button>
          <el-button type="primary" @click="updateNodeInfo">确定</el-button>
        </div>
      </div>
    </el-drawer>
    <!-- footer -->
    <div class="btns">
      <el-button type="primary" @click="handleSaveWorkFlow">
        <i class="iconfont icon-cunchu margin-right-5" style="font-size:14px;"></i>保存
      </el-button>
      <el-button type="primary" @click="handleClean">
        <i class="el-icon-delete" style="font-size:14px;"></i>清空
      </el-button>
      <el-button type="primary" icon="el-icon-refresh-right" @click="handleRestore">恢复</el-button>
    </div>
  </div>
</template>

<script>
import clickoutside from '@/utils/clickoutside.js';

import { jsPlumb, jsPlumbUtil } from 'jsplumb';

import jspConfig from '@/utils/jsplumbConfig.js';
import panzoom from 'panzoom';

export default {
  name: 'workflow',
  /**
   * Click on events that are not generated internally by the component
   */
  directives: { clickoutside },
  computed: {},
  data() {
    return {
      nodeForm: {
        // 右侧抽屉form
        nodeId: '',
        nodeName: '',

        desc: ''
      },

      dragInstance: null,
      dropInstance: null, // jsplumb 在右侧画布的实例
      nodes: [],
      currentNode: {},
      deleteTarget: {
        type: '',
        nodeId: '', // 删除节点需要
        connection: null // 删除连线需要
      },
      isShowDrawer: false, // 右侧抽屉
      contextMenuPosition: [9999, 9999],
      zoom: 1,
      mainContainerWrap: null,
      pan: null,
      flowInfo: {}
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      this.jsplumbInit();
    },

    jsplumbInit() {
      jsPlumb.ready(() => {
        // 拖拽实例(从左到右)
        let dragInstance = jsPlumb.getInstance();
        // 落地实例
        let dropInstance = jsPlumb.getInstance(jspConfig);
        this.dragInstance = dragInstance; // 用于禁止fork和join二次拖拽
        this.dropInstance = dropInstance;

        // 设置从左到右拖拽过去的元素
        let dragItem = document.querySelectorAll('.drag-item');
        let dropArea = document.getElementById('canvas');

        this.dragAndDrop(dragInstance, dropInstance, dragItem, dropArea);
        // 设置元素的各种事件
        this.fireEvents(dropInstance);

        // 设置缩放平移
        this.zoomCanvas(dropInstance);
      });
    },
    /**
     * @description: 拖放过程
     * @param dragInstance{function} 仅用于从左侧拖放到右侧的jsplumb实例，拖拽完成后在右边用另一个实例
     * @param dropInstance{function} 仅用于右侧主要连线区域的实例
     * @param dragItem {node} 一个元素节点，需要拖拽的节点
     * @param dropArea{node} 一个元素节点，拖拽后的落地区域
     * @return:
     */
    dragAndDrop(dragInstance, dropInstance, dragItem, dropArea) {
      let self = this;
      let drag = document.getElementById('drag');

      // 拖拽
      dragInstance.draggable(dragItem, {
        clone: true,
        parent: drag,
        containment: false,
        ghostProxy: true,
        start: function(start) {
          console.log({ start });
        },
        // drag: function(drag) {
        //   console.log({ drag });
        // },
        stop: function(stop) {
          console.log({ stop });
          // 节点配置，弹窗
          // self.isShowDrawer = true;
        }
      });
      // 落地
      dragInstance.droppable(dropArea, {
        over: function() {
          console.log('OVER!');
        },
        out: function() {
          console.log('OUT!');
        },
        drop: function(p) {
          console.log({ p });
          let dragEl = p.drag.el;
          let dropEl = p.drop.el;

          let nodeName = dragEl.title;

          let nodeId = jsPlumbUtil.uuid();

          console.log({ jsPlumbUtil });
          let containerRect = dropEl.getBoundingClientRect();
          let scale = self.getScale();

          // Get mouse coordinates
          const left = (p.e.pageX - containerRect.left) / scale;
          const top = (p.e.pageY - containerRect.top) / scale;

          let node = {
            nodeId,
            nodeName,
            position: { x: left - 60, y: top + 10 },
            properties: {}
          };
          console.log({ node });

          self.nodes.push(node);
          self.$nextTick(() => {
            self.initNode(dropInstance, nodeId);
          });
        }
      });
    },
    /**
     * @description 获取缩放比率
     * @returns {number} 缩放比率
     */
    getScale() {
      let scale1;
      let { pan, dropInstance } = this;
      if (pan) {
        const { scale } = pan.getTransform();
        scale1 = scale;
      } else {
        const matrix = window.getComputedStyle(dropInstance.getContainer())
          .transform;
        scale1 = matrix.split(', ')[3] * 1;
      }
      dropInstance.setZoom(scale1);
      return scale1;
    },

    /**
     * @description: 初始化一个单独的节点
     * @param nodeId {string} 将要初始化节点的id
     * @param initType {string} source-源节点 target-目标节点。不填则既是source又是target
     * @return:
     */
    initNode(dropInstance, nodeId, initType) {
      let dragEl = document.getElementById(nodeId);

      dropInstance.draggable(dragEl, {
        parent: 'canvas'
      });

      // let config = {
      //   // 节点配置
      //   allowLoopback: false,
      // };
      let sourceAnchor = {
        allowLoopback: false,
        anchor: ['Bottom'],
        anchors: ['Bottom'],
        isSource: true,
        endpoint: [
          'Dot',
          {
            cssClass: 'source-endpoint',
            radius: 5,
            hoverClass: 'cursor-crosshair'
          }
        ],
        paintStyle: {
          stroke: '#7AB02C',
          strokeWidth: 1,
          outlineStroke: '#7AB02C',
          outlineWidth: 1
        }
      };
      let targetAnchor = {
        allowLoopback: false,
        anchor: ['Top'],
        anchors: ['Top'],
        isTarget: true,
        endpoint: [
          'Dot',
          {
            cssClass: 'target-endpoint',
            radius: 5
          }
        ],
        paintStyle: {
          stroke: '#409EFF',
          strokeWidth: 1,
          outlineStroke: '#409EFF',
          outlineWidth: 1
          // fill: '#409EFF',
        }
      };

      if (initType === 'source') {
        dropInstance.addEndpoint(nodeId, sourceAnchor, {
          uuid: `${nodeId}-source`
        });
      } else if (initType === 'target') {
        dropInstance.addEndpoint(nodeId, targetAnchor, {
          uuid: `${nodeId}-target`
        });
      } else {
        dropInstance.addEndpoint(nodeId, sourceAnchor, {
          uuid: `${nodeId}-source`
        });
        dropInstance.addEndpoint(nodeId, targetAnchor, {
          uuid: `${nodeId}-target`
        });
      }
    },
    /**
     * @description: 事件
     * @param instance {function} jsplumb实例
     * @return:
     */
    fireEvents(instance) {
      let self = this;
      // 连接前验证
      instance.bind('beforeDrop', function({
        sourceId,
        targetId,
        scope,
        connection,
        dropEndpoint
      }) {
        console.log({ scope, dropEndpoint, connection });
        // let { source, target } = connection;

        let allConn = instance.getAllConnections();

        console.log({ allConn });

        let isNoConnect = allConn.length === 0; // 无连接
        if (isNoConnect) {
          return true;
        }

        let isSourceIsConnected = allConn.some(item => {
          return item.sourceId === sourceId;
        });

        let isTargetIsConnected = allConn.some(item => {
          return item.targetId === targetId;
        });

        if (isSourceIsConnected) {
          console.log({ info: 'source节点已经有连接了' });
          return false;
        }

        if (isTargetIsConnected) {
          console.log({ info: 'target节点已经有连接了' });
          return false;
        }

        return true;
      });
      // 点击事件
      instance.bind('click', function(connection, event) {
        console.log({ instance, connection, event });
      });
      // 右键点击事件
      instance.bind('contextmenu', function(component, event) {
        let { pageX, pageY } = event;

        let containerRect = this.getContainer().getBoundingClientRect();
        let scale = self.getScale();
        const left = (pageX - containerRect.left) / scale;
        const top = (pageY - containerRect.top) / scale;

        let position = [left, top];

        self.contextMenuPosition = position;

        // 存放删除的对象
        self.deleteTarget = {
          ...{ type: 'connection', connection: component }
        };
        event.preventDefault();
        event.stopPropagation();
      });
    },

    /**
     * @description: 保存节点数据
     * @param {type}
     * @return:
     */
    saveFlow() {
      let { dropInstance, nodes } = this;
      let allConnections = dropInstance.getAllConnections();

      let relation = allConnections.map(item => {
        return {
          sourceId: item.sourceId,
          targetId: item.targetId
        };
      });
      let nodesInfo = {};
      jsPlumbUtil.each(document.querySelectorAll('.node'), function(el) {
        nodesInfo[el.id] = { x: el.offsetLeft, y: el.offsetTop };
      });
      console.log({ nodes });
      nodes.forEach(item => {
        this.$set(item, 'position', nodesInfo[item.nodeId]);
      });

      console.log({ relation, nodes });
      this.flowInfo = { relation, nodes };
    },

    /**
     * @description: 节点右键点击事件
     * @param {type}
     * @return:
     */
    rightClick(node, $event) {
      let { offsetLeft, offsetTop } = $event.currentTarget;

      this.contextMenuPosition = [offsetLeft + 50, offsetTop];
      // this.contextMenuVisible = true;
      this.currentNode = JSON.parse(JSON.stringify(node));
      this.deleteTarget = { ...{ type: 'node', nodeId: node.nodeId } };
    },

    editNode() {
      let { nodeName, properties } = this.currentNode;
      this.isShowDrawer = true;
      this.nodeForm = { ...properties, ...{ nodeName } };
    },
    copyNode() {
      let { nodes } = this;
      let { nodeId } = this.currentNode;

      let node = nodes.find(item => {
        return item.nodeId === nodeId;
      });

      let ele = document.getElementById(nodeId);
      let { offsetLeft, offsetTop } = ele;

      let cloneNodeId = jsPlumbUtil.uuid();
      let cloneNode = {
        ...node,
        ...{
          nodeId: cloneNodeId,
          position: { x: offsetLeft + 50, y: offsetTop + 50 }
        }
      };
      this.nodes.push(cloneNode);
      let { dropInstance } = this;
      this.$nextTick(() => {
        this.initNode(dropInstance, cloneNodeId);
      });
    },
    delElement() {
      let { deleteTarget, dropInstance } = this;
      let { type, nodeId, connection } = deleteTarget;
      console.log({ type, nodeId, connection });
      let tip = type === 'node' ? '是否删除节点' : '是否删除连线';
      this.$confirm(tip, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          if (type === 'node') {
            console.log('节点删除');
            this.delNode(dropInstance, nodeId);
          } else {
            console.log('连线删除');
            console.log({ dropInstance, connection });

            this.delConnection(dropInstance, connection);
          }
        })
        .catch(err => {
          console.error({ err });
        });
    },
    /**
     * @description: 删除节点
     * @param {type}
     * @return:
     */
    delNode(instance, nodeId) {
      instance.remove(nodeId);
      // 从this.nodes移除已经删除的节点
      let index = this.nodes.findIndex(item => {
        return item.nodeId === nodeId;
      });
      this.nodes.splice(index, 1);
    },
    /**
     * @description: 删除连线
     * @param {type}
     * @return:
     */
    delConnection(instance, connection) {
      instance.deleteConnection(connection);
    },
    updateNodeInfo() {
      this.$refs.nodeForm.validate(valid => {
        if (valid) {
          let { currentNode, nodeForm, nodes } = this;
          let { nodeId } = currentNode;
          nodes.forEach(item => {
            if (item.nodeId === nodeId) {
              this.$set(item, 'properties', { ...nodeForm });
              this.$set(item, 'nodeName', nodeForm.nodeName);
            }
          });
          this.$message({
            showClose: true,
            message: '保存成功',
            type: 'success'
          });

          this.isShowDrawer = false;
        }
      });
    },

    hiddenRightMenu() {
      this.contextMenuPosition = [9999, 9999];
    },
    /**
     * @description: 屏蔽浏览器右键点击事件
     * @param {type}
     * @return:
     */
    canvasRightClick(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    },

    /**
     * @description: 保存工作流
     * @param {type}
     * @return:
     */
    handleSaveWorkFlow() {
      return this.saveFlow();
    },
    handleClean() {
      this.nodes = [];

      this.dropInstance.empty('canvas');
    },

    handleRestore() {
      let { relation, nodes } = this.flowInfo;

      // 画节点
      this.nodes = nodes;
      // 连线
      this.$nextTick(() => {
        this.redrawOverflow(this.dropInstance, relation, nodes);
      });
    },

    redrawOverflow(dropInstance, relation, nodes) {
      dropInstance.batch(() => {
        nodes.forEach(item => {
          this.initNode(dropInstance, item.nodeId);
        });

        relation.forEach(item => {
          dropInstance.connect({
            uuids: [`${item.sourceId}-source`, `${item.targetId}-target`]
            // scope: 'workflow',
          });
        });
      });
      // jsPlumb.fire('jsPlumbDemoLoaded', dropInstance);
    },

    zoomCanvas(instance) {
      const mainContainer = instance.getContainer();
      const mainContainerWrap = mainContainer.parentNode;
      const pan = panzoom(mainContainer, {
        smoothScroll: false,
        bounds: true,
        // autocenter: true,
        zoomDoubleClickSpeed: 1,
        minZoom: 0.5,
        maxZoom: 2
      });
      this.mainContainerWrap = mainContainerWrap;
      this.pan = pan;
      // 缩放时设置jsPlumb的缩放比率
      pan.on('zoom', e => {
        const { scale } = e.getTransform();
        instance.setZoom(scale);
      });

      // 平移时设置鼠标样式
      mainContainerWrap.style.cursor = 'grab';
      mainContainerWrap.addEventListener('mousedown', function wrapMousedown() {
        this.style.cursor = 'grabbing';
        mainContainerWrap.addEventListener('mouseout', function wrapMouseout() {
          this.style.cursor = 'grab';
        });
      });
      mainContainerWrap.addEventListener('mouseup', function wrapMouseup() {
        this.style.cursor = 'grab';
      });
    },
    /**
     * @description  放大画布
     */
    zoomIn() {
      let { mainContainerWrap, pan } = this;
      const x = mainContainerWrap.clientWidth / 2;
      const y = mainContainerWrap.clientHeight / 2;
      pan.smoothZoom(x, y, 1.2);
    },

    /**
     * @description 缩小画布
     */
    zoomOut() {
      let { mainContainerWrap, pan } = this;
      const x = mainContainerWrap.clientWidth / 2;
      const y = mainContainerWrap.clientHeight / 2;
      pan.smoothZoom(x, y, 0.8);
    }
  },
  filters: {}
};
</script>

<style >
*:focus {
  outline: none;
}
.workflow {
  width: 800px;
  height: 600px;
  margin: 50px auto;
}
.drag-box {
  position: relative;
  display: flex;
}
.drag-ul {
  margin: 0;
  padding: 0;
  width: 100px;
  background: #f7f9fb;
}
.drop {
  position: relative;
  width: calc(100% - 100px);

  overflow: hidden;
  border: 1px solid #eee;
  outline: none !important;
}
.drop .canvas {
  position: relative;
  height: 100%;
  width: 100%;
  outline: none !important;
}
.right-menu {
  position: absolute;
  left: 9999px;
  top: 9999px;
  z-index: 100;
  padding: 0;
  margin: 0;
  box-shadow: 1px 1px 3px #eee;
  background: #fff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.right-menu li {
  list-style: none;
  padding: 0 10px;
  height: 30px;
  line-height: 30px;
  font-size: 12px;
  cursor: pointer;
}
.node {
  position: absolute;
  width: 120px;
  padding: 0 5px;
  border-width: 2px;
  border: 1px solid #409eff;
  border-radius: 5px;
}
.node-status {
  top: 6px;
  right: 0;
}
.node-name {
  max-width: 75px;
}
.fullscreen-canvas {
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 200;
}
.select-node {
  background: #00c88d;
  color: #fff;
}
.connectorHoverClass path {
  stroke: #00c88d;
}

.node-log {
  height: 100%;
  width: 100%;
}
.side-content {
  height: 100%;
  width: 100%;
}

.input-300.el-input,
.el-select.input-300 {
  width: 100%;
  max-width: 300px;
}
.el-card__header {
  padding: 10px;
}
.toolbar {
  border-bottom: none;
  height: 50px;
  line-height: 50px;
}
.drag-item {
  margin-bottom: 10px;
  cursor: move;
  color: rgb(27, 28, 35);
  border: 1px solid #aaa;
  list-style: none;
}

.drag-item.not-allowed {
  cursor: not-allowed;
  color: #8a8a8a;
}

.drag-box {
  height: 400px;
}
.text-align-right {
  text-align: right;
}
.cursor-crosshair {
  cursor: crosshair;
}
.btns {
  margin-top: 20px;
  text-align: center;
}
</style>
