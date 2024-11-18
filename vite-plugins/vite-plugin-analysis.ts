import { Plugin } from 'vite'
import * as fs from 'fs'
import path from 'path'
import http from 'http'
import { exec } from 'child_process'

export const analysis = (): Plugin => {
  const dirname = process.cwd()
  return {
    name: 'vite:analysis',
    enforce: 'post',
    async writeBundle(outputOptions, bundle) {
      const nodes = []
      const edges = []
      const metaDataNodes = []
      for (let id of Object.keys(bundle)) {
        const data = bundle[id]
        if (data.type === 'asset') {
          continue
        }

        const node = {
          id,
          size: new Blob([data.code]).size,
          type: data.type,
          modules: [] as { size: number; file: string }[]
        }

        node.modules = (Object.keys(data.modules) || []).map((file) => {
          return {
            size: new Blob([data.modules[file].code]).size,
            file: file.replace(dirname, '')
          }
        })
        if (data.isEntry) {
          node.isEntry = true
        }
        nodes.push(node)

        const addEdge = (target, source, type = 'sync') => {
          edges.push({
            source,
            target,
            type,
            id: `${source}-${target}`
          })
        }
        // 引入的依赖
        data.imports?.forEach((it) => {
          addEdge(it, id)
        })
        // 引入的异步依赖
        data.dynamicImports?.forEach((it) => {
          console.log('async')
          addEdge(it, id, 'async')
        })
        if (data.viteMetadata?.importedAssets || data.viteMetadata?.importedCss) {
          metaDataNodes.push(node)
        }
        // 需要的css和图片算作同步需要，直接添加size
        data.viteMetadata?.importedAssets.forEach((it) => {
          const size = new Blob([bundle[it].source]).size
          node.modules.push({
            file: it,
            size
          })
          node.size += size
        })
        data.viteMetadata?.importedCss.forEach((it) => {
          const size = new Blob([bundle[it].source]).size
          node.modules.push({
            file: it,
            size
          })
          node.size += size
        })
      }

      const data = {
        edges,
        nodes
      }
      http
        .createServer((req, res) => {
          res.end(`${temp}<script> window.data=${JSON.stringify(data)}</script>`)
        })
        .listen(9354, () => {
          const command =
            process.platform === 'win32'
              ? 'start'
              : process.platform === 'darwin'
              ? 'open'
              : 'xdg-open'

          // 执行命令打开默认浏览器并访问指定的URL
          exec(`${command} http://localhost:9354`, (error, stdout, stderr) => {
            if (error) {
              console.error(`Error opening browser: ${error}`)
            }
          })
        })
    },
    closeBundle() {
      console.log('浏览器打开地址查看：http://localhost:9354')
    }
  }
}
const temp = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>graph</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/d3-force@3"></script>
    <script src="https://unpkg.com/d3-dispatch@3"></script>
    <script src="https://unpkg.com/d3-quadtree@3"></script>
    <script src="https://unpkg.com/d3-timer@3"></script>
  </head>
  <style>
    * {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    #app {
      position: relative;
      height: 100vh;
      width: 100%;
      overflow: hidden;
    }
    .node-tip {
      position: absolute;
      
      pointer-events: none;
      background-color: #121313;
      color: #fff;
      padding: 4px;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .line {
      stroke: green;
      stroke-width: 3px;
      fill: none;
    }

    .sync {
      stroke: red;
    }
  </style>
  <body>
    <div id="app">
      <ul
        class="node-tip"
        v-if="pickedNode"
        :style="{transform:getTranslate(pickedNode.clientX,pickedNode.clientY )}"
      >
        <h4>{{pickedNode.id}}：{{size(pickedNode.size)}}</h4>
        <h4>包含的modules</h4>
        <li v-for="it in pickedNode.modules.slice(0,8)">{{it.file}}:{{size(it.size)}}</li>
        <li v-if=" pickedNode.modules.length>8">点击节点在控制台重查看更多信息</li>
        <h4>包含的chunks：{{size(pickedNode.chunks.reduce((a,b)=>a+b.size,0))}}</h4>
        <li v-for="it in pickedNode.chunks.slice(0,8)">{{it.id}}:{{size(it.size)}}</li>
        <li v-if="pickedNode.chunks.length>8">点击节点在控制台重查看更多信息</li>
      </ul>

      <svg viewBox="0 0 1000 1000" ref="svg">
        <defs>
          <!-- 用作箭头的 marker -->
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="red" />
          </marker>
          <marker
            id="arrow2"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="green" />
          </marker>
          <g id="star">
            <polygon
              points="100,10 40,180 190,60 10,60 160,180"
              style="fill: red; stroke: red; stroke-width: 5; fill-rule: nonzero"
            />
          </g>
        </defs>
        <g>
          <path
            v-for="it in edges"
            :class="\`\${it.type} line\`"
            :key="it.id"
            :d="getPath(it)"
            fill="none"
            :style="{opacity:isShow(it.id) ? 1 :0.01}"
            :marker-end="it.type === 'sync' ?  'url(#arrow)' : 'url(#arrow2)'"
          ></path>
        </g>
        <g>
          <template v-for="node of nodes" :key="node.id">
            <g
              @mouseenter="e => enter(e,node)"
              @mouseleave="leave"
              @click="showDetail(node)"
              :style="{opacity:isShow(node.id) ? 1 :0.01}"
            >
              <circle
                class="node"
                :fill="node.isEntry ? 'red':'darkgoldenrod'"
                cx="0"
                cy="0"
                :style="{transform: getTranslate(node.x,node.y)}"
                :r="node.r"
              />
              <text
                fill="#121033"
                :x="node.x"
                :y="node.y"
                style="text-anchor: middle; alignment-baseline: middle"
              >
                {{node.id.replace('assets/','')}}
              </text>
            </g>
          </template>
        </g>
      </svg>
    </div>
  </body>
</html>

<script type="module">
  const svg = document.querySelector('svg')
  const width = svg.clientWidth
  const height = svg.clientHeight
  svg.viewBox.baseVal.width = width
  svg.viewBox.baseVal.height = height
  const {
    forceSimulation,
    forceManyBody,
    forceLink,
    forceCollide,
    forceCenter
  }  =  window.d3
  const nodesSet = new Set()
  const edgeMap = new Map()
  const sourceMap = new Map()
  const nodesMap = new Map()
  data.nodes.forEach((it) => {
    nodesMap.set(it.id, it)
  })
  data.edges.forEach((it) => {
    nodesSet.add(it.source)
    nodesSet.add(it.target)
    if (edgeMap.has(it.target + '-'+ it.source)) {
      edgeMap.get(it.target + '-'+ it.source).lineType = 'q'
      it.lineType = 'q'
    } else {
      it.lineType = 'line'
    }
    edgeMap.set(it.id, it)
    if (sourceMap.has(it.source)) {
      sourceMap.get(it.source).push(it)
    } else {
      sourceMap.set(it.source, [it])
    }
  })
  const entry = data.nodes.filter((it) => it.isEntry)
  let roots = [{ next: entry, visited: new Set(entry) }];
  const rollup = (node, visited) => {
    const next = []
    const chunks = []
    const dfs = (node,path) => {
      const edges = sourceMap.get(node.id) || []
      for (let it of edges) {
        const target = nodesMap.get(it.target)
        //删除 import xx from "https://xxx"
        if(!target) continue
        if (visited.has(target)) continue
        visited.add(target)
        if (it.type === 'sync') {
          chunks.push({...target,importedPath:path.slice()})
          path.push(node.id)
          dfs(it,path)
          path.pop()
        } else {
          next.push(target)
        }
      }
    }
    dfs(node,[node.id])
    return { next, chunks }
  }
  const _nodes = []
  const uniqWith = (arr, k) => {
    const set = new Set()
    return arr.filter((it) => {
      const key = k(it)
      if (set.has(key)) return
      set.add(key)
      return true
    })
  }
  while (roots.length) {
    let temp = []
    for (let { next, visited } of roots) {
      for (let it of next) {
        _nodes.push(it)
        const _visited = new Set()

        visited.forEach((it) => _visited.add(it))
        const { next, chunks } = rollup(it, _visited)
        it.chunks = chunks
        it.size += chunks.reduce((a, b) => a + b.size, 0)
        temp.push({ next, visited: _visited })
      }
    }
    roots = temp
  }

  const links = forceLink().id((e) => e.id)

  const repulsion = forceManyBody()
  window.repulsion = repulsion
  // const center = forceCenter(0, 0).strength(0.3)
  const min = Math.min(..._nodes.map((it) => it.size))

  const map = new Map()
  let max = 0
  const nodes = Vue.reactive(_nodes)
  nodes.forEach((it) => {
    map.set(it.id, it)
    it.r = Math.log((it.size * 2) / min) * 4
    max = Math.max(it.r, max)
    it.x=0
    it.y=0
  })
  window.edgeMap = edgeMap
  window.map = map
  window.sourceMap = sourceMap
  const _edges = data.edges.filter((it) => map.has(it.source) && map.has(it.target))
  const edges = Vue.reactive(_edges)
  const collide = forceCollide()
  collide.radius(max) // 碰撞大小
  const simulation = forceSimulation()
    // .force('center', center)
    .force('link', links)
    .force('charge', repulsion)
    .force('collide', collide)
    .force('center', forceCenter(width / 2, height / 2))
  simulation.nodes(nodes)
  links.id((d) => d.id)
  window.links = links
  links.distance(500)
  links.links(edges.map((it) => ({ ...it })))
  window.sim = simulation
  // simulation.alpha(0);
  simulation.on('tick', (v) => {
    // console.log(nodes[0])
    // console.log(edges[0]);
  })

  const createZoom = (svg, moveFn) => {
    const baseVal = svg.viewBox.baseVal
    const originWidth = baseVal.width
    svg.addEventListener('wheel', (e) => {
      const w = Math.min(Math.max(100, baseVal.width - e.deltaY), width * 4)
      const h = Math.min(Math.max(100, baseVal.height - e.deltaY), height * 4)
      if (w === baseVal.width || baseVal.height === h) return
      baseVal.width = w
      baseVal.height = h
    })
    let record = null
    let data = null

    svg.addEventListener('mousedown', (e) => {
      record = { x: e.x, y: e.y }
      data = {
        x: baseVal.x,
        y: baseVal.y,
        width: baseVal.width,
        height: baseVal.height
      }
    })
    window.addEventListener('mousemove', (e) => {
      if (record) {
        const dx = e.x - record.x
        const dy = e.y - record.y
        baseVal.x = data.x - (dx * baseVal.width) / originWidth
        baseVal.y = data.y - (dy * baseVal.width) / originWidth
      }
    })
    window.addEventListener('mouseup', (e) => {
      record = null
      data = null
    })
  }

  const app = Vue.createApp({
    setup() {
      let showIds = Vue.ref(null)
      const enter = (e, node) => {
        pickedNode.value = { ...node, clientX: e.clientX, clientY: e.clientY }
        const tempShowIds = new Set([node.id])
        edges.forEach((it) => {
          if (it.source === node.id) {
            tempShowIds.add(it.target)
            tempShowIds.add(it.id)
          } else if (it.target === node.id) {
            tempShowIds.add(it.source)
            tempShowIds.add(it.id)
          }
        })

        showIds.value = tempShowIds
      }
      window.addEventListener('mousemove', (e) => {
        if (pickedNode.value) {
          pickedNode.value.clientX = e.clientX
          pickedNode.value.clientY = e.clientY
        }
      })
      const leave = () => {
        pickedNode.value = null
        showIds.value = null
      }

      const getPath = (line) => {
        const source = map.get(line.source)
        const target = map.get(line.target)
        const dy = target.y - source.y
        const dx = target.x - source.x
        const len = Math.sqrt(dy * dy + dx * dx)
        const k = target.r / len
        const endY = target.y - k * dy
        const endX = target.x - k * dx
        if (line.lineType === 'line')
          return \`M \${source.x} \${source.y} L \${endX - dx * 0.005} \${endY - dy * 0.005}\`
        const diff = 80
        const x = (source.x + target.x) / 2 - (diff / len) * dy
        const y = (source.y + target.y) / 2 + (diff / len) * dx
        return \`M \${source.x + (source.r / len) * dx} \${
          source.y + (source.r / len) * dy
        } Q \${x} \${y} \${endX - dx * 0.005} \${endY - dy * 0.005}\`
      }
      const pickedNode = Vue.ref()
      const showDetail = (node) => {
        console.log('点详情', node)
      }
      Vue.onMounted(() => {
        createZoom(document.querySelector('svg'))
      })
      const getTranslate = (x, y) => {
        return 'translate(' + x + 'px,' + y + 'px)'
      }
      const isShow = (id) => {
        return !showIds.value || showIds.value.has(id)
      }
      const size = (n) => {
        const toFixed = (k) => +k.toFixed(2)
        return n > 1024 * 1024
          ? toFixed(n / 1024 / 1024) + 'MB'
          : n > 1024
          ? toFixed(n / 1024) + 'KB'
          : n + 'B'
      }
    window.nodes = nodes
    window.edges = edges
      return {
        nodes,
        edges,
        map,
        pickedNode,
        enter,
        leave,
        getPath,
        showDetail,
        getTranslate,
        isShow,
        size
      }
    }
  })
  window.app = app
  app.mount('#app')
</script>`
