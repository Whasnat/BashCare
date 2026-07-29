1. Creating Users: 
    - As a Landlord, I can create managers, login for managers, and assign managers to a specific or multiple properties. I can do everything for my properties.
    - In Each property I can assign Modulewise roles to managers. Ex: Unit-Manager, Billing-Manager, Maintenance-Manager, etc.
    - As a Manager, I can create tenants, login for tenants, and assign tenants to a specific or multiple units.
    - As a Tenant, I can login and view my profile and agreements, and make payments and all the other stuff a tenant can do so far in the project.

2. Creating Properties: 
    - As a Landlord, I can create properties. Each property can have multiple units.
    - Each property will have a Property Code that the manager will have to provide when logging in. This property code will be visible to all managers and tenants of that property. 
    - A manager can only see and manage the properties and section of properties that the landlord is given access to. Ex: A manager can only see and manage Unit section of a property if he is a unit manager for that property. 

3. Logging in:
    - omit logging in with email and implement username. 
    - As an admin I can login with my username/ login name and password.
    - As a Landlord I can login with my username/ login name and password.
    - As a Manager I can login with my username/ login name, password and property code.
    - As a Tenant I can login with my username/ login name, password and property code.
    - In first page, user will see username/login name field and Property Code field for Manager and Tenant (C:\Users\WaliulHasnatRahat\Documents\Projects\test\Screenshot 2026-07-26 113345.png). after clicking next, they will be taken to another page where they will see password field along with already entered fields in readonly format (C:\Users\WaliulHasnatRahat\Documents\Projects\test\Screenshot 2026-07-26 113313.png)

4. Assigning Roles:
    - Roles should be module wise and they should be dependent logically. Ex: I cannot assign Billing Manager role to a user if the user is not a Manager for the property. (C:\Users\WaliulHasnatRahat\Documents\Projects\test\Screenshot 2026-07-26 113432.png) (C:\Users\WaliulHasnatRahat\Documents\Projects\test\Screenshot 2026-07-26 113539.png)

5. Impersonation:
    - As Admin I can impersonate a landlord with limited Access to help Landlords setup their account, properties and other workflows.
    - As landlords I can Impersonate Managers of a specific property to verify their access and ocationally work on their behalf.
    - When Impersonating, activity log will clearly show that landlord is impersonating a manager for transperancy. 
6. Activity Log:
    - Admins will have access to all activity logs of all users with exact time stamp, login/usernames, activities, actions taken ect. everything.
    - Landlords will have access to activity logs of their properties.