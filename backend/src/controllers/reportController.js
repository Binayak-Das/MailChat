import Report from '../models/Report.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { createNotificationAndEmit } from '../utils/notificationHelper.js';

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

    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'Reported user not found'
      });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      reason: reason.trim(),
      details: details ? details.trim() : ''
    });

    const populatedReport = await Report.findById(report._id)
      .populate('reporter', 'name email avatar role')
      .populate('reportedUser', 'name email avatar role status');

    const admins = await User.find({ role: 'admin' });
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

    const reports = await Report.find(filter)
      .populate('reporter', 'name email avatar role')
      .populate('reportedUser', 'name email avatar role status')
      .sort({ createdAt: -1 });

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

    const updated = await Report.findById(reportId)
      .populate('reporter', 'name email avatar role')
      .populate('reportedUser', 'name email avatar role status');

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
