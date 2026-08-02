import { Table } from 'antd'
import type { TableProps } from 'antd'

/**
 * 表格默认值收敛：紧凑尺寸、不分页、窄屏横向滚动。
 *
 * `scroll.x = 'max-content'` 是移动端的关键——管理页那些十来列的表在手机上
 * 不该把整个页面撑出横向滚动条，而应该只让表格自己滚。
 */
export function ResponsiveTable<T extends object>(props: TableProps<T>) {
  return <Table<T> size="small" pagination={false} scroll={{ x: 'max-content' }} {...props} />
}
