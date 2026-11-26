import Report from '../models/Report.js';
import { createNotificationAndEmit } from '../utils/notificationHelper.js';
import {
  getUserById,
  getAllUsers,
  getUsersMap,
  pickUserFields
} from '../utils/userStore.js';

async function populateReport(reportDoc, idToken) {
  const report = reportDoc.toObject ? reportDoc.toObject() : reportDoc;
  const map = await getUsersMap([report.reporter, report.reportedUser], idToken);
  return {
    ...report,
    reporter: pickUserFields(map.get(report.reporter?.toString()), [
      'name',
      'email',
      'avatar',
      'role'
    ]) || { _id: report.reporter, name: 'Deleted User', email: '' },
    reportedUser: pickUserFields(map.get(report.reportedUser?.toString()), [
      'name',
      'email',
      'avatar',
      'role',
      'status'
    ]) || { _id: report.reportedUser, name: 'Deleted User', email: '', status: 'deleted' }
  };
}

export const createReport = async (req, res) => {
  try {
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reported user ID and reason are required'
      });
    }

    if (reportedUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own account'
      });
    }

    const reportedUser = await getUserById(reportedUserId, req.firebaseToken);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'Reported user not found'
      });
    }

    const report = await Report.create({
      reporter: req.user._id.toString(),
      reportedUser: reportedUserId.toString(),
      reason: reason.trim(),
      details: details ? details.trim() : ''
    });

    const populatedReport = await populateReport(report, req.firebaseToken);

    const allUsers = await getAllUsers(req.firebaseToken);
    const admins = allUsers.filter((u) => u.role === 'admin');
    const io = req.app.get('io');
    for (const admin of admins) {
      await createNotificationAndEmit(io, {
        userId: admin._id,
        title: 'New Account Report',
        message: `${req.user.name} reported ${reportedUser.name} for "${reason.trim()}".`,
        type: 'report'
      });
      if (io) {
        io.to(admin._id.toString()).emit('new_report', populatedReport);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Account has been reported to administrators for review',
      report: populatedReport
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error submitting report'
    });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};

    const rawReports = await Report.find(filter).sort({ createdAt: -1 }).lean();
    const userIds = rawReports.flatMap((r) => [r.reporter, r.reportedUser]);
    const map = await getUsersMap(userIds, req.firebaseToken);

    const reports = rawReports.map((r) => ({
      ...r,
      reporter: pickUserFields(map.get(r.reporter?.toString()), [
        'name',
        'email',
        'avatar',
        'role'
      ]) || { _id: r.reporter, name: 'Deleted User', email: '' },
      reportedUser: pickUserFields(map.get(r.reportedUser?.toString()), [
        'name',
        'email',
        'avatar',
        'role',
        'status'
      ]) || { _id: r.reportedUser, name: 'Deleted User', email: '', status: 'deleted' }
    }));

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error fetching reports'
    });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, actionTaken, adminNotes } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (status) report.status = status;
    if (actionTaken) report.actionTaken = actionTaken;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;

    await report.save();

    const updated = await populateReport(report, req.firebaseToken);

    return res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating report'
    });
  }
};
