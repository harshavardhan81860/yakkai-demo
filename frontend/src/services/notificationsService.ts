import api from './api';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export const fetchUserNotifications = async (userId: string): Promise<Notification[]> => {
    const response = await api.get(`api/v1/notifications/?user_id=${userId}`);
    return response.data.data.notifications;
};

export const fetchUnreadNotificationCount = async (userId: string): Promise<number> => {
    const response = await api.get(`api/v1/notifications/unread-count?user_id=${userId}`);
    return response.data.data.count;
};

export const markNotificationAsRead = async (notificationId: string, userId: string): Promise<Notification> => {
    const response = await api.put(`api/v1/notifications/${notificationId}/read?user_id=${userId}`);
    return response.data.data.notification;
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    await api.put(`api/v1/notifications/read-all?user_id=${userId}`);
};
