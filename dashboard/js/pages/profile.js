

// js/pages/profile.js
import { AuthAPI } from '../api.js';
import { pageContent, showToast, showLoading } from '../main.js';

export async function loadProfilePage() {
    try {
        const profile = await AuthAPI.getProfile();

        pageContent.innerHTML = `
            <div class="card" style="max-width: 800px; margin: 0 auto;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-user-cog"></i>
                        Profile Settings
                    </h3>
                </div>

                <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                <th>First Name</th> 
                                <th>Last Name</th>
                                <th>Email</th> 
                                <th colspan="2">Username</th>

                                </tr>
                                <tbody>
                                <tr>
                                <td>${profile.first_name || ''}</td>
                                <td>${profile.last_name || ''}</td>
                                <td>${profile.email || ''}<td>
                                <td>${profile.username || ''}</td>
                                </tr>
                                </tbody>
                            <thead>
                        </table>
                </div>



                
            </div>
        `;

        // document.getElementById('profileForm').addEventListener('submit', async (e) => {
        //     e.preventDefault();
        //     showLoading();

        //     const formData = new FormData(e.target);
        //     const profileData = {
        //         first_name: formData.get('first_name'),
        //         last_name: formData.get('last_name'),
        //         email: formData.get('email'),
        //         username: formData.get('username')
        //     };

        //     // Handle password change if provided
        //     const newPassword = formData.get('new_password');
        //     if (newPassword) {
        //         if (newPassword !== formData.get('confirm_password')) {
        //             showToast('error', 'Error', 'Passwords do not match');
        //             showLoading(false);
        //             return;
        //         }
        //         profileData.password = newPassword;
        //         profileData.current_password = formData.get('current_password');
        //     }

        //     try {
        //         await AuthAPI.updateProfile(profileData);
        //         showToast('success', 'Updated', 'Profile updated successfully');
        //         loadProfilePage();
        //     } catch (error) {
        //         showToast('error', 'Error', error.message || 'Failed to update profile');
        //     } finally {
        //         showLoading(false);
        //     }
        // });

    } catch (error) {
        console.error('Failed to load profile:', error);
        showToast('error', 'Error', 'Failed to load profile');
    }
}


















// <form id="profileForm" style="padding: 1rem 0;">
//                     <div class="form-row">
//                         <div class="form-group">
//                             <label>First Name</label>
//                             <input type="text" name="first_name" value="${profile.first_name || ''}" required>
//                         </div>
//                         <div class="form-group">
//                             <label>Last Name</label>
//                             <input type="text" name="last_name" value="${profile.last_name || ''}" required>
//                         </div>
//                     </div>

//                     <div class="form-group">
//                         <label>Email</label>
//                         <input type="email" name="email" value="${profile.email || ''}" required>
//                     </div>

//                     <div class="form-group">
//                         <label>Username</label>
//                         <input type="text" name="username" value="${profile.username || ''}" required>
//                     </div>

//                     <div style="border-top: 1px solid var(--border-color); margin: 2rem 0; padding-top: 2rem;">
//                         <h4 style="margin-bottom: 1rem;">Change Password</h4>
//                         <div class="form-group">
//                             <label>Current Password</label>
//                             <input type="password" name="current_password">
//                         </div>
//                         <div class="form-row">
//                             <div class="form-group">
//                                 <label>New Password</label>
//                                 <input type="password" name="new_password">
//                             </div>
//                             <div class="form-group">
//                                 <label>Confirm Password</label>
//                                 <input type="password" name="confirm_password">
//                             </div>
//                         </div>
//                     </div>

//                     <button type="submit" class="btn btn-primary btn-block">
//                         <i class="fas fa-save"></i>
//                         Save Changes
//                     </button>
//                 </form>