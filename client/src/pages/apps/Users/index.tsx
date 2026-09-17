import { PageBreadcrumb } from '../../../components'

const UsersApp = () => {
  return (
    <div>
      <PageBreadcrumb title="Users" name="Users" breadCrumbItems={["Apps", "Users"]} />
      <div className="mt-6">
        <h1>Users Management</h1>
      </div>
    </div>
  )
}

export default UsersApp
