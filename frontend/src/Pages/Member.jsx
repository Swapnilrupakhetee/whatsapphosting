import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../Styles/Member.css'

const Member = () => {
    const [members, setMembers] = useState([]);
    const [formData, setFormData] = useState({
        "Name of Ledger": '',
        "Under": '',
        "phone_number": ''
    });
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCategory, setSearchCategory] = useState('Name of Ledger');
    const [bulkUpdateCategory, setBulkUpdateCategory] = useState('');
    const [bulkUpdatePhoneNumber, setBulkUpdatePhoneNumber] = useState('');

    // Predefined under options with phone numbers
    const underOptions = [
        { under_value: "Sundry Debtors", phone_number: "9844781086" },
        { under_value: "Sundry Debtors Chandan Ji", phone_number: "9808111702" },
        { under_value: "Sundry Debtors Gpl", phone_number: "9744306601" },
        { under_value: "Sundry Debtors Mukesh Ji", phone_number: "9863035521" },
        { under_value: "Sundry Debtors Rajiv Ji", phone_number: "9863811729" },
        { under_value: "Sundry Debtors Vinod Ji", phone_number: "9862239703" },
        { under_value: "Sundry Debtors Vishal Ji", phone_number: "9844781086" }
    ];

    const baseURL = `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/info`;

    // Fetch all members
    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(baseURL);
            setMembers(response.data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    // Filter members based on search
    const filteredMembers = members.filter(member => {
        const searchValue = member[searchCategory]?.toString().toLowerCase() || '';
        return searchValue.includes(searchTerm.toLowerCase());
    });

    // Handle input changes for form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Add or update member
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`${baseURL}/${editingId}`, formData);
                setEditingId(null);
            } else {
                await axios.post(baseURL, formData);
            }
            setFormData({ "Name of Ledger": '', "Under": '', "phone_number": '' });
            fetchMembers();
        } catch (err) {
            setError(err.message);
        }
    };

    // Bulk update phone numbers for a specific category
    const handleBulkUpdate = async () => {
        try {
            // Filter members with the selected category
            const membersToUpdate = members.filter(
                member => member.Under === bulkUpdateCategory
            );

            // Perform bulk update
            const updatePromises = membersToUpdate.map(member => 
                axios.put(`${baseURL}/${member._id}`, {
                    ...member,
                    phone_number: bulkUpdatePhoneNumber
                })
            );

            await Promise.all(updatePromises);
            
            // Refresh members list
            fetchMembers();

            // Reset bulk update fields
            setBulkUpdateCategory('');
            setBulkUpdatePhoneNumber('');

            // Show success message
            alert(`Updated ${membersToUpdate.length} members in the ${bulkUpdateCategory} category`);
        } catch (err) {
            setError(err.message);
        }
    };

    // Edit member
    const handleEdit = (id) => {
        const member = members.find((m) => m._id === id);
        setFormData(member);
        setEditingId(id);
    };

    // Delete member
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this member?')) {
            try {
                await axios.delete(`${baseURL}/${id}`);
                fetchMembers();
            } catch (err) {
                setError(err.message);
            }
        }
    };

    return (
        <div className="member-container">
            <h1>Member Management</h1>

            {/* Search Section */}
            <div className="search-container">
                <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="search-select"
                >
                    <option value="Name of Ledger">Name of Ledger</option>
                    <option value="Under">Under</option>
                    <option value="phone_number">Phone Number</option>
                </select>
                <input
                    type="text"
                    placeholder={`Search by ${searchCategory}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* Bulk Update Section */}
            <div className="bulk-update-container">
                <h2>Bulk Phone Number Update</h2>
                <select
                    value={bulkUpdateCategory}
                    onChange={(e) => setBulkUpdateCategory(e.target.value)}
                    className="form-control"
                >
                    <option value="">Select Category to Update</option>
                    {[...new Set(members.map(m => m.Under))].map((category, index) => (
                        <option key={index} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="New Phone Number"
                    value={bulkUpdatePhoneNumber}
                    onChange={(e) => setBulkUpdatePhoneNumber(e.target.value)}
                    className="form-control"
                />
                <button 
                    onClick={handleBulkUpdate} 
                    className="bulk-update-button"
                    disabled={!bulkUpdateCategory || !bulkUpdatePhoneNumber}
                >
                    Bulk Update Phone Numbers
                </button>
            </div>

            <form className="member-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        type="text"
                        name="Name of Ledger"
                        placeholder="Name of Ledger"
                        value={formData["Name of Ledger"]}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <select
                        name="Under"
                        value={formData.Under}
                        onChange={handleChange}
                        required
                        className="form-control"
                    >
                        <option value="">Select Under Category</option>
                        {underOptions.map((option, index) => (
                            <option key={index} value={option.under_value}>
                                {option.under_value}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <input
                        type="text"
                        name="phone_number"
                        placeholder="Phone Number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit" className="submit-button">
                    {editingId ? 'Update' : 'Add'} Member
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">Loading....</div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name of Ledger</th>
                                <th>Under</th>
                                <th>Phone Number</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((member) => (
                                <tr key={member._id}>
                                    <td>{member["Name of Ledger"]}</td>
                                    <td>{member.Under}</td>
                                    <td>{member.phone_number}</td>
                                    <td>
                                        <button 
                                            className="edit-button"
                                            onClick={() => handleEdit(member._id)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className="delete-button"
                                            onClick={() => handleDelete(member._id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Member;