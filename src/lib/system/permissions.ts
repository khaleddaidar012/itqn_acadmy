export const PERMISSIONS = [
  { key: 'staff_create', label: 'إضافة معلمين وموظفين' },
  { key: 'staff_edit', label: 'تعديل بيانات المعلمين' },
  { key: 'staff_delete', label: 'حذف المعلمين وإيقاف حساباتهم' },
  { key: 'schedule_manage', label: 'تعيين الحصص والمواعيد والتأجيل والإلغاء' },
  { key: 'attendance_manage', label: 'تسجيل حضور الطلاب لجميع المعلمين' },
  { key: 'students_manage', label: 'إضافة الطلاب وتأكيد حساباتهم' },
  { key: 'pay_view', label: 'رؤية سعر الساعة للمعلمين' },
  { key: 'hours_view', label: 'رؤية إجمالي ساعات المعلمين' },
] as const
export type Permission = typeof PERMISSIONS[number]['key']
export const DEFAULT_MANAGER: Permission[] = ['schedule_manage', 'attendance_manage', 'students_manage', 'hours_view']
type Account = { role: string; manage?: number; permissions?: string | null }
export function grants(account: Account): Permission[] {
  if (account.role === 'admin') return PERMISSIONS.map(p => p.key)
  if (account.role !== 'teacher') return []
  if (account.permissions == null) return account.manage ? DEFAULT_MANAGER : []
  try { const list: unknown = JSON.parse(account.permissions); return Array.isArray(list) ? PERMISSIONS.map(p => p.key).filter(k => list.includes(k)) : [] } catch { return [] }
}
export const allowed = (account: Account, permission: Permission) => grants(account).includes(permission)
