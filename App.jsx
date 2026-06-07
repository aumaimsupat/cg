import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  User, 
  Calendar, 
  Folder, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Edit, 
  Clock, 
  Sparkles, 
  Camera,
  Layers,
  Search,
  CheckCircle,
  Activity,
  Lock,
  LogOut,
  Database,
  RefreshCw,
  HelpCircle,
  MapPin,
  Phone,
  FileText,
  Shield,
  Briefcase,
  Layers3,
  CheckSquare
} from 'lucide-react';

export default function App() {
  // --- CONFIG / API CONNECTION ---
  // นำ URL ของคุณที่ได้จากการ Deploy มากำหนดเป็นค่าเริ่มต้นให้อย่างถาวรเพื่อความสะดวกสบาย
  const defaultUrl = "https://script.google.com/macros/s/AKfycbxHPP5ip4kp1R6KE3xOMwU7ZelW2Yhlp5VXsMTLbrdSCMNdcX3bmRHHLBq5tiP3irrQ/exec";
  
  const [scriptUrl, setScriptUrl] = useState(() => {
    return localStorage.getItem('caremed_script_url') || defaultUrl;
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, testing, connected, error
  const [connectionError, setConnectionError] = useState("");

  // --- STATE ---
  // Auth State (Login via Email & Password)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('caremed_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // List of Patients assigned to this caregiver
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  // Current Active Patient Details
  const [patient, setPatient] = useState({
    id: "PAT-OFFLINE",
    name: "นายบี ใจเย็น",
    nickname: "บี",
    ageGenderDob: "20 ปี / ชาย",
    nationalId: "1-1002-34567-89-0",
    medicalConditions: "เบาหวาน, มีภาวะวูบบ่อย",
    bloodGroup: "O",
    allergies: "แพ้ยา Penicillin",
    precautions: "เสี่ยงต่อการล้มบ่อย, ห้ามปล่อยให้อยู่ลำพัง",
    contactRelative: "นางใจดี ใจเย็น (มารดา) โทร: 089-111-2222",
    address: "123/4 หมู่ 5 ถ.สุขุมวิท กรุงเทพฯ",
    hospitalInfo: "รพ.จุฬาลงกรณ์ (นพ.สมชาย / แผนกอายุรกรรม)",
    insuranceType: "บัตรทอง (รพ.จุฬาลงกรณ์)"
  });
  
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editedPatient, setEditedPatient] = useState({ ...patient });

  // Medications List for the Active Patient
  const [medicines, setMedicines] = useState([
    {
      id: "med-1",
      name: "Metformin (เมทฟอร์มิน)",
      disease: "โรคเบาหวาน",
      dosage: "500 มิลลิกรัม",
      timeSlots: ["เช้า", "เย็น"],
      instructions: "หลังอาหารทันที",
      barcode: "8851234567890",
      pillColor: "bg-white text-slate-800 border-slate-300",
      pillShape: "rounded-full w-8 h-8",
      notes: "ทานพร้อมอาหารเพื่อลดอาการคลื่นไส้"
    }
  ]);

  // Active Tab View ('dashboard', 'pillbox', 'manage', 'config')
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Filter by Disease category
  const [selectedDisease, setSelectedDisease] = useState(null);

  // Daily Tracker (taken status map)
  const [takenTracker, setTakenTracker] = useState({});

  // Form State for Adding/Editing Medication
  const [medForm, setMedForm] = useState({
    id: "",
    name: "",
    disease: "โรคเบาหวาน",
    dosage: "",
    timeSlots: [],
    instructions: "",
    barcode: "",
    pillColor: "bg-white text-slate-800 border-slate-300",
    pillShape: "rounded-full w-8 h-8",
    notes: ""
  });
  const [isEditingMed, setIsEditingMed] = useState(false);
  const [notification, setNotification] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [dataLoading, setDataLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Common options
  const availableDiseases = ["โรคเบาหวาน", "โรคความดันโลหิตสูง", "โรคไขมันในเลือดสูง", "โรคภูมิแพ้", "โรคหัวใจ", "บำรุงประสาท", "อื่นๆ"];

  const colorsPreset = [
    { name: "ขาว", value: "bg-white text-slate-800 border-slate-300" },
    { name: "ชมพู", value: "bg-pink-100 text-pink-700 border-pink-300" },
    { name: "ฟ้า", value: "bg-sky-100 text-sky-700 border-sky-300" },
    { name: "เหลือง", value: "bg-amber-50 text-amber-700 border-amber-300" },
    { name: "เขียว", value: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    { name: "ส้ม", value: "bg-orange-100 text-orange-700 border-orange-300" }
  ];

  const shapesPreset = [
    { name: "กลมเล็ก", value: "rounded-full w-8 h-8" },
    { name: "กลมใหญ่", value: "rounded-full w-12 h-12" },
    { name: "วงรีแนวนอน", value: "rounded-full w-12 h-6" },
    { name: "แคปซูล", value: "rounded-2xl w-14 h-6 border-2" },
    { name: "สี่เหลี่ยมมน", value: "rounded-lg w-8 h-8" }
  ];

  // --- GOOGLE SHEETS CONNECTION & DATA SYNC ---

  const testConnection = async (urlToTest = scriptUrl) => {
    if (!urlToTest) {
      setConnectionStatus('disconnected');
      return false;
    }
    setConnectionStatus('testing');
    setConnectionError("");
    try {
      const response = await fetch(`${urlToTest}?action=test`);
      const data = await response.json();
      if (data.status === "success") {
        setConnectionStatus('connected');
        localStorage.setItem('caremed_script_url', urlToTest);
        return true;
      } else {
        throw new Error(data.message || "การทดสอบล้มเหลว");
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError("ไม่สามารถเชื่อมต่อกับชีตได้: โปรดตรวจสอบว่าคุณได้เลือก Deploy เป็น Web App แบบ 'Anyone' และอัปเดตสิทธิ์บนชีตแล้ว");
      return false;
    }
  };

  const fetchPatientData = async (caregiverId, patientId) => {
    if (!scriptUrl || !caregiverId || !patientId) return;
    setDataLoading(true);
    try {
      const response = await fetch(`${scriptUrl}?action=getData&caregiverId=${encodeURIComponent(caregiverId)}&patientId=${encodeURIComponent(patientId)}`);
      const data = await response.json();
      if (data.status === "success") {
        setPatient(data.patient);
        setEditedPatient(data.patient);
        setMedicines(data.medicines);
        setTakenTracker(data.tracker || {});
        if (data.myPatients) {
          setAssignedPatients(data.myPatients);
        }
        triggerNotification(`ดึงข้อมูลคุณ ${data.patient.name} สำเร็จ!`);
      } else {
        triggerNotification(`ข้อผิดพลาด: ${data.message}`);
      }
    } catch (err) {
      triggerNotification("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อซิงก์ข้อมูลได้");
    } finally {
      setDataLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อตั้งค่าหรือเปลี่ยนคนไข้ที่จะดูแล
  useEffect(() => {
    if (scriptUrl) {
      testConnection(scriptUrl).then(connected => {
        if (connected && currentUser) {
          const targetId = selectedPatientId || currentUser.assignedPatientIds[0];
          if (targetId) {
            setSelectedPatientId(targetId);
            fetchPatientData(currentUser.id, targetId);
          }
        }
      });
    }
  }, [scriptUrl, selectedPatientId]);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  // --- ACTIONS ---

  // ล็อกอินเข้าใช้งาน
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setAuthError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    // โหมดทดลองงาน ออฟไลน์แบบด่วน (สำหรับใช้กรณีไม่มีคลาวด์)
    if (!scriptUrl) {
      if (loginForm.email === "demo@email.com" && loginForm.password === "passA123") {
        const mockOfflineUser = {
          id: "CG-01",
          name: "นายเอ รักดี",
          email: "a@email.com",
          phone: "081-234-5678",
          assignedPatientIds: ["P-01", "P-02"]
        };
        setCurrentUser(mockOfflineUser);
        setAssignedPatients([
          { id: "P-01", name: "นายบี ใจเย็น" },
          { id: "P-02", name: "นางสาวซี สดใส" }
        ]);
        setSelectedPatientId("P-01");
        localStorage.setItem('caremed_user', JSON.stringify(mockOfflineUser));
        triggerNotification("ลงชื่อเข้าใช้สำเร็จ (จำลองแบบ Offline)");
        setAuthLoading(false);
        return;
      } else {
        setAuthError("อีเมลหรือรหัสผ่านจำลองไม่ถูกต้อง (คำแนะนำออฟไลน์: demo@email.com / passA123)");
        setAuthLoading(false);
        return;
      }
    }

    try {
      const url = `${scriptUrl}?action=login&email=${encodeURIComponent(loginForm.email)}&password=${encodeURIComponent(loginForm.password)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "success") {
        setCurrentUser(data.caregiver);
        localStorage.setItem('caremed_user', JSON.stringify(data.caregiver));
        triggerNotification(`เข้าสู่ระบบในฐานะ: ${data.caregiver.name}`);
        
        // กำหนดคนไข้คนแรกที่จะเข้าตรวจดูแล
        if (data.caregiver.assignedPatientIds && data.caregiver.assignedPatientIds.length > 0) {
          const firstPatientId = data.caregiver.assignedPatientIds[0];
          setSelectedPatientId(firstPatientId);
          await fetchPatientData(data.caregiver.id, firstPatientId);
        }
      } else {
        setAuthError(data.message || "ไม่สามารถล็อกอินได้");
      }
    } catch (err) {
      setAuthError("เกิดข้อผิดพลาดในการรับ-ส่งข้อมูลกับ Apps Script โปรดตรวจสอบ URL");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAssignedPatients([]);
    setSelectedPatientId("");
    localStorage.removeItem('caremed_user');
    triggerNotification("ออกจากระบบเรียบร้อย");
  };

  // บันทึกและซิงค์ข้อมูลผู้ป่วย
  const handleSavePatient = async (e) => {
    e.preventDefault();
    setPatient({ ...editedPatient });
    setIsEditingPatient(false);

    if (!scriptUrl || patient.id === "PAT-OFFLINE") {
      triggerNotification("อัปเดตข้อมูลผู้ป่วยเฉพาะในเครื่องเรียบร้อย (ออฟไลน์)");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: JSON.stringify({
          action: "savePatient",
          patient: { ...editedPatient, id: selectedPatientId }
        })
      });
      const data = await response.json();
      if (data.status === "success") {
        triggerNotification("ซิงค์ข้อมูลผู้ป่วยขึ้น Google Sheets เรียบร้อย!");
        fetchPatientData(currentUser.id, selectedPatientId);
      } else {
        triggerNotification(`บันทึกล้มเหลว: ${data.message}`);
      }
    } catch (err) {
      triggerNotification("เกิดความล่าช้าในการเชื่อมต่อคลาวด์ขณะอัปเดตข้อมูลผู้ป่วย");
    } finally {
      setIsSyncing(false);
    }
  };

  // บันทึกหรือเพิ่มรายการยา
  const handleMedSubmit = async (e) => {
    e.preventDefault();
    if (!medForm.name.trim()) {
      triggerNotification("กรุณาระบุชื่อยาด้วยครับ");
      return;
    }

    const payload = { ...medForm };
    const isEdit = isEditingMed;

    // เก็บชื่อยาเดิมไว้เป็นคีย์สำหรับสืบค้นอ้างอิงตอนอัปเดตบนแถวของชีต
    if (isEdit) {
      payload.originalName = medForm.originalName || medForm.name;
    }

    // อัปเดตฝั่ง React หน้าบ้านก่อน
    if (isEdit) {
      setMedicines(medicines.map(m => m.id === medForm.id ? { ...payload } : m));
    } else {
      setMedicines([...medicines, { ...payload, id: "med-" + Date.now() }]);
    }

    resetMedForm();
    setActiveTab('dashboard');

    if (!scriptUrl || patient.id === "PAT-OFFLINE") {
      triggerNotification(isEdit ? "แก้ไขยาเรียบร้อยแล้ว (ออฟไลน์)" : "เพิ่มยาลงระบบเรียบร้อย (ออฟไลน์)");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: JSON.stringify({
          action: "saveMedicine",
          medicine: payload,
          patientId: selectedPatientId,
          patientName: patient.name,
          caregiverName: currentUser.name
        })
      });
      const data = await response.json();
      if (data.status === "success") {
        triggerNotification(`ซิงค์รายการยา "${payload.name}" เรียบร้อยแล้ว`);
        fetchPatientData(currentUser.id, selectedPatientId);
      }
    } catch (err) {
      triggerNotification("ไม่สามารถอัปเดตยาไปยังเซิร์ฟเวอร์ชีตได้ในขณะนี้");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditMedStart = (med) => {
    setMedForm({ 
      ...med, 
      originalName: med.name // จดบันทึกชื่อยาดั้งเดิมไว้เพื่อใช้อ้างอิงแถวบนชีตกรณีเปลี่ยนชื่อยาใหม่
    });
    setIsEditingMed(true);
    setActiveTab('manage');
  };

  const handleDeleteMed = async (medName) => {
    const isConfirmed = window.confirm(`คุณต้องการลบยา "${medName}" ออกจากรายชื่อยาของคนไข้ใช่หรือไม่?`);
    if (!isConfirmed) return;

    // อัปเดตในสเตต
    setMedicines(medicines.filter(m => m.name !== medName));
    triggerNotification(`ลบรายการยา "${medName}" เรียบร้อย`);

    if (!scriptUrl || patient.id === "PAT-OFFLINE") return;

    setIsSyncing(true);
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: JSON.stringify({
          action: "deleteMedicine",
          patientId: selectedPatientId,
          medicineName: medName
        })
      });
      const data = await response.json();
      if (data.status === "success") {
        triggerNotification("ถอนการลงทะเบียนยาออกจาก Google Sheets สำเร็จ");
        fetchPatientData(currentUser.id, selectedPatientId);
      }
    } catch (err) {
      triggerNotification("ไม่สามารถลบยาบนชีตได้");
    } finally {
      setIsSyncing(false);
    }
  };

  // การเช็กการทานยารายวัน
  const togglePillTaken = async (timeSlot, med) => {
    const today = new Date().toDateString();
    const key = `${today}-${timeSlot}-${med.name}`;
    const nextVal = !takenTracker[key];

    setTakenTracker(prev => ({
      ...prev,
      [key]: nextVal
    }));

    if (!scriptUrl || patient.id === "PAT-OFFLINE") {
      triggerNotification(nextVal ? "เช็กการจ่ายยาเสร็จสิ้น" : "ยกเลิกประวัติการจ่ายยา");
      return;
    }

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: JSON.stringify({
          action: "updateTracker",
          key: key,
          taken: nextVal
        })
      });
      triggerNotification(nextVal ? "บันทึกข้อมูลการจ่ายยาเข้าคลาวด์แล้ว" : "อัปเดตการยกเลิกจ่ายยาเรียบร้อย");
    } catch (err) {
      triggerNotification("สัญญาณขัดข้อง ไม่สามารถบันทึกการทานยาขึ้นเซิร์ฟเวอร์แบบเรียลไทม์ได้");
    }
  };

  const handleTimeSlotToggle = (slot) => {
    const current = [...medForm.timeSlots];
    if (current.includes(slot)) {
      setMedForm({ ...medForm, timeSlots: current.filter(s => s !== slot) });
    } else {
      setMedForm({ ...medForm, timeSlots: [...current, slot] });
    }
  };

  const resetMedForm = () => {
    setMedForm({
      id: "",
      name: "",
      disease: "โรคเบาหวาน",
      dosage: "",
      timeSlots: [],
      instructions: "",
      barcode: "",
      pillColor: "bg-white text-slate-800 border-slate-300",
      pillShape: "rounded-full w-8 h-8",
      notes: ""
    });
    setIsEditingMed(false);
  };

  const simulateBarcodeScan = () => {
    const randomBarcodes = ["8851023451011", "8852304910329", "8859942318042", "8853381004829"];
    const randomBarcode = randomBarcodes[Math.floor(Math.random() * randomBarcodes.length)];
    
    const mockMeds = [
      { name: "Metformin (เมทฟอร์มิน)", dosage: "500 มิลลิกรัม", instructions: "หลังอาหารทันที", disease: "โรคเบาหวาน", notes: "สังเกตความผิดปกติของทางเดินอาหาร" },
      { name: "Amlodipine (แอมโลดิพีน)", dosage: "5 มิลลิกรัม", instructions: "หลังอาหารเช้า", disease: "โรคความดันโลหิตสูง", notes: "ช่วยคุมระดับความดันโลหิตให้ลดลง" },
      { name: "Cetirizine (เซทิริซีน)", dosage: "10 มิลลิกรัม", instructions: "ทานก่อนนอน", disease: "โรคภูมิแพ้", notes: "ยาต้านฮิสตามีนลดอาการแพ้" }
    ];
    const picked = mockMeds[Math.floor(Math.random() * mockMeds.length)];

    setMedForm(prev => ({
      ...prev,
      barcode: randomBarcode,
      name: picked.name,
      dosage: picked.dosage,
      instructions: picked.instructions,
      disease: picked.disease,
      notes: picked.notes
    }));
    triggerNotification("จำลองการสแกนบาร์โค้ด และสืบค้นโครงสร้างยาเสร็จสิ้น!");
  };

  // --- RENDERING SECURITY LOGIN VIEW ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 shadow-xl text-white py-4 px-6 text-center sm:text-left">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-1.5 rounded-full shadow-inner">
                <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
              </div>
              <h1 className="text-xl font-black tracking-wide">CareMed Easy Security Login</h1>
            </div>
            <span className="text-xs bg-black/30 px-3 py-1 rounded-full text-pink-200 font-medium">
              ระบบตรวจสอบและล็อกอินจำกัดสิทธิ์ผู้ดูแลตาม Google Sheets
            </span>
          </div>
        </header>

        {/* Main Form container */}
        <main className="max-w-md w-full mx-auto p-4 flex-1 flex flex-col justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/15 rounded-full blur-2xl"></div>
            
            <div className="text-center mb-6 relative z-10">
              <div className="bg-pink-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-8 h-8 text-pink-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white">ลงชื่อเข้าใช้งานผู้ดูแล</h2>
              <p className="text-xs text-slate-400 mt-1">
                กรอกบัญชีผู้ดูแล เพื่อตรวจดูข้อมูลคนไข้และยาเฉพาะของคุณเท่านั้น
              </p>
            </div>

            {authError && (
              <div className="bg-red-950/40 border border-red-500/40 text-red-300 text-xs p-3.5 rounded-xl mb-5 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">อีเมลผู้ดูแล (Email Address)</label>
                <input 
                  type="email" 
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="ป้อนอีเมล เช่น a@email.com"
                  className="w-full text-sm p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-100 placeholder-slate-650"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">รหัสผ่านเข้าใช้งาน (Password)</label>
                <input 
                  type="password" 
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="ป้อนรหัสผ่านเข้าใช้งาน"
                  className="w-full text-sm p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-100 placeholder-slate-650"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold py-3 rounded-xl shadow-lg transition transform active:scale-95 disabled:opacity-50 flex justify-center items-center"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    กำลังเชื่อมต่อชีต...
                  </>
                ) : (
                  <span>ตรวจสอบสิทธิ์และเข้าสู่ระบบ</span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs">
              <button 
                onClick={() => {
                  setLoginForm({ email: "demo@email.com", password: "passA123" });
                  triggerNotification("ใส่ข้อมูลผู้ดูแลทดสอบ 'นายเอ รักดี' เรียบร้อย!");
                }}
                className="text-pink-400 hover:underline hover:text-pink-300 font-semibold"
              >
                คลิกเพื่อทดสอบด้วยสิทธิ์ของ 'นายเอ รักดี' (แบบ Offline)
              </button>
            </div>
          </div>

          {/* Connection URL Config Area inside login page */}
          <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-1.5 mb-2">
              <Database className="w-4 h-4 text-pink-500" />
              <label className="text-xs font-bold text-pink-300">ลิงก์ Google Sheet API ปัจจุบัน :</label>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="https://script.google.com/macros/s/.../exec"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className="flex-1 text-xs p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
              <button 
                onClick={() => testConnection(scriptUrl)}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-3 rounded-lg font-bold border border-slate-700 whitespace-nowrap"
              >
                บันทึกค่า
              </button>
            </div>
            {connectionStatus === 'connected' && <span className="text-[10px] text-emerald-400 block mt-1.5 font-semibold">✓ ตรวจพบความจุคลาวด์ พร้อมล็อกอินใช้งาน</span>}
            {connectionStatus === 'testing' && <span className="text-[10px] text-amber-400 block mt-1.5 animate-pulse">กำลังสืบค้นอินสแตนซ์...</span>}
            {connectionStatus === 'error' && <span className="text-[10px] text-red-400 block mt-1.5 font-medium">✗ เกิดข้อผิดพลาดในการตรวจสอบเชื่อมต่อ</span>}
          </div>
        </main>

        <footer className="text-center py-4 text-xs text-slate-600">
          CareMed Easy © 2026 ระบบพยาบาลและผู้ดูแลเชื่อมโยงความปลอดภัย
        </footer>
      </div>
    );
  }

  // --- MAIN APP FOR LOGGED-IN CAREGIVER ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16">
      
      {/* Toast Banner */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2 animate-bounce border border-rose-400">
          <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          <span className="font-semibold text-sm">{notification}</span>
        </div>
      )}

      {/* Modern Friendly Header */}
      <header className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 shadow-xl sticky top-0 z-40 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-full shadow-inner">
              <Heart className="w-6 h-6 text-rose-600 fill-rose-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-extrabold tracking-wide">CareMed Easy</h1>
                <span className="bg-black/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold text-pink-200">
                  ระบบผู้ดูแลอัจฉริยะ
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">เชื่อมต่อกับระบบรายงานวิเคราะห์ยาบน Google Sheets</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {/* Caregiver Identity */}
            <div className="bg-rose-950 bg-opacity-40 px-3.5 py-1.5 rounded-xl flex items-center space-x-2 border border-rose-500/30">
              <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                <User className="w-3 h-3" />
              </div>
              <div>
                <span className="font-bold block leading-none">{currentUser.name}</span>
                <span className="text-[9px] text-pink-200 font-semibold">รหัสผู้ดูแล: {currentUser.id}</span>
              </div>
            </div>

            {/* Syncing Trigger */}
            {scriptUrl && (
              <button 
                onClick={() => fetchPatientData(currentUser.id, selectedPatientId)}
                disabled={dataLoading}
                className="bg-rose-800 hover:bg-rose-900 p-2 rounded-xl border border-rose-500/40 text-rose-100 transition flex items-center justify-center"
                title="รีเฟรชข้อมูลยาคนไข้จากชีต"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Sign out */}
            <button 
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-red-950 px-3 py-2 rounded-xl text-pink-300 hover:text-red-300 font-bold border border-slate-800 transition flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ================= LEFT COLUMN: CURRENT ACTIVE PATIENT & NAVIGATION ================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* MULTI-PATIENT SWITCHER (หากผู้ดูแลมีสิทธิ์ดูแลหลายคน มีปุ่มให้คลิกสลับดูคนไข้) */}
          {assignedPatients.length > 1 && (
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-pink-400 block">สลับดูข้อมูลคนไข้ที่รับมอบหมาย:</span>
              <div className="grid grid-cols-2 gap-2">
                {assignedPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                      selectedPatientId === p.id
                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-md'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-[8px] opacity-75 bg-black/20 px-1 py-0.5 rounded">{p.id}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE PATIENT INFOCARD (บัตรคนไข้) */}
          <div className="bg-pink-100 rounded-3xl p-6 shadow-xl border-4 border-pink-200 text-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-200 rounded-bl-full opacity-40 -z-0"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <span className="bg-pink-300 text-pink-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" /> ข้อมูลผู้ป่วยที่กำลังตรวจดูแล
                </span>
                <button 
                  onClick={() => {
                    setIsEditingPatient(!isEditingPatient);
                    setEditedPatient({ ...patient });
                  }}
                  className="p-2 bg-white/80 hover:bg-white rounded-full transition-all text-pink-700 shadow-sm"
                  title="แก้ไขข้อมูลผู้ป่วยคนนี้"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              {isSyncing && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex items-center justify-center z-20 rounded-2xl">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-pink-600 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-pink-800">กำลังอัปเดตระบบชีต...</p>
                  </div>
                </div>
              )}

              {!isEditingPatient ? (
                /* Patient details view */
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-pink-250 rounded-2xl flex items-center justify-center text-pink-700 text-2xl font-black shadow-inner">
                      {patient.nickname ? patient.nickname.charAt(0) : patient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{patient.name}</h3>
                      <p className="text-xs font-semibold text-slate-600 mt-1">
                        รหัสคนไข้: <span className="text-pink-700 font-bold">{selectedPatientId}</span> {patient.nickname ? `(ชื่อเล่น: ${patient.nickname})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-pink-200 pt-3 space-y-2 text-xs text-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">ข้อมูลอายุ/เพศ:</span> <strong className="block text-slate-900">{patient.ageGenderDob || "-"}</strong></div>
                      <div><span className="text-slate-500">หมู่เลือด:</span> <strong className="block text-slate-900">{patient.bloodGroup || "-"}</strong></div>
                    </div>
                    <div>
                      <span className="text-slate-500">เลขบัตรประชาชน:</span> 
                      <strong className="block text-slate-900">{patient.nationalId || "-"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">โรคประจำตัว / วินิจฉัยแรกรับ:</span>
                      <span className="bg-pink-200 text-pink-900 px-2 py-1 rounded inline-block mt-0.5 font-bold">
                        {patient.medicalConditions || "ไม่มีโรคประจำตัว"}
                      </span>
                    </div>

                    <div className="mt-3 bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200 flex items-start space-x-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[11px] uppercase tracking-wide">แพ้ยา:</strong>
                        <p className="font-semibold text-[10px]">{patient.allergies || "ไม่มีประวัติแพ้ยา"}</p>
                      </div>
                    </div>

                    {patient.precautions && (
                      <div className="bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200 flex items-start space-x-1.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-[11px] uppercase tracking-wide">ข้อควรระวังการดูแลพิเศษ:</strong>
                          <p className="font-semibold text-[10px]">{patient.precautions}</p>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-pink-200 space-y-1 text-[11px]">
                      <div><span className="text-slate-500">ติดต่อญาติ:</span> <strong className="text-slate-900 block">{patient.contactRelative || "-"}</strong></div>
                      <div><span className="text-slate-500">ที่อยู่คนไข้:</span> <strong className="text-slate-900 block">{patient.address || "-"}</strong></div>
                      <div><span className="text-slate-500">แพทย์และโรงพยาบาลดูแล:</span> <strong className="text-slate-900 block">{patient.hospitalInfo || "-"}</strong></div>
                      <div><span className="text-slate-500">สิทธิ์การรักษา:</span> <strong className="text-slate-900 block">{patient.insuranceType || "-"}</strong></div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Patient details edit form */
                <form onSubmit={handleSavePatient} className="space-y-3 text-slate-700 text-xs">
                  <div>
                    <label className="block font-bold mb-0.5 text-slate-700">ชื่อ-นามสกุล คนไข้</label>
                    <input 
                      type="text" 
                      value={editedPatient.name}
                      onChange={(e) => setEditedPatient({ ...editedPatient, name: e.target.value })}
                      className="w-full p-2 text-xs rounded bg-white border border-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold mb-0.5 text-slate-700">ชื่อเล่น</label>
                      <input 
                        type="text" 
                        value={editedPatient.nickname}
                        onChange={(e) => setEditedPatient({ ...editedPatient, nickname: e.target.value })}
                        className="w-full p-2 text-xs rounded bg-white border border-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-0.5 text-slate-700">อายุ / เพศ / วดป.</label>
                      <input 
                        type="text" 
                        value={editedPatient.ageGenderDob}
                        onChange={(e) => setEditedPatient({ ...editedPatient, ageGenderDob: e.target.value })}
                        className="w-full p-2 text-xs rounded bg-white border border-pink-300"
                        placeholder="เช่น 20 ปี / ชาย"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5 text-slate-700">โรคประจำตัว</label>
                    <input 
                      type="text" 
                      value={editedPatient.medicalConditions}
                      onChange={(e) => setEditedPatient({ ...editedPatient, medicalConditions: e.target.value })}
                      className="w-full p-2 text-xs rounded bg-white border border-pink-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5 text-slate-700">ประวัติแพ้ยา</label>
                    <input 
                      type="text" 
                      value={editedPatient.allergies}
                      onChange={(e) => setEditedPatient({ ...editedPatient, allergies: e.target.value })}
                      className="w-full p-2 text-xs rounded bg-white border border-pink-300 text-red-700 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5 text-slate-700">ข้อควรระวังพิเศษ</label>
                    <input 
                      type="text" 
                      value={editedPatient.precautions}
                      onChange={(e) => setEditedPatient({ ...editedPatient, precautions: e.target.value })}
                      className="w-full p-2 text-xs rounded bg-white border border-pink-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5 text-slate-700">ข้อมูลติดต่อญาติ</label>
                    <input 
                      type="text" 
                      value={editedPatient.contactRelative}
                      onChange={(e) => setEditedPatient({ ...editedPatient, contactRelative: e.target.value })}
                      className="w-full p-2 text-xs rounded bg-white border border-pink-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5 text-slate-700">แพทย์/โรงพยาบาลหลัก</label>
                    <input 
                      type="text" 
                      value={editedPatient.hospitalInfo}
                      onChange={(e) => setEditedPatient({ ...editedPatient, hospitalInfo: e.target.value })}
                      className="w-full p-2 text-xs rounded bg-white border border-pink-300"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button 
                      type="submit" 
                      className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded transition"
                    >
                      บันทึก
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsEditingPatient(false)}
                      className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 rounded transition"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* MENU NAVIGATION BUTTONS */}
          <div className="bg-pink-100/10 rounded-3xl p-5 border-2 border-pink-500/30 space-y-3 shadow-md">
            <h4 className="text-xs font-bold text-pink-300 tracking-wider uppercase mb-1 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-pink-400" />
              <span>เมนูหลักในการดูแลคนไข้คนนี้</span>
            </h4>
            
            <button 
              onClick={() => { setActiveTab('pillbox'); setSelectedDisease(null); }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold transition-all border text-left ${
                activeTab === 'pillbox' 
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-lg translate-x-1' 
                  : 'bg-slate-800 text-pink-100 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-pink-300" />
                <div>
                  <div className="text-xs">ตารางให้ยารายวัน</div>
                  <div className="text-[9px] text-pink-200/60 font-normal">เช็กประวัติจ่ายยา เช้า กลางวัน เย็น ก่อนนอน</div>
                </div>
              </div>
            </button>

            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedDisease(null); }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold transition-all border text-left ${
                activeTab === 'dashboard' && selectedDisease === null
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-lg translate-x-1' 
                  : 'bg-slate-800 text-pink-100 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Folder className="w-5 h-5 text-pink-300" />
                <div>
                  <div className="text-xs">สรุปยาทุกประเภทของเขา</div>
                  <div className="text-[9px] text-pink-200/60 font-normal">คัดแยกตามกลุ่มอาการรักษารายโรค</div>
                </div>
              </div>
              <span className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {medicines.length} ตัว
              </span>
            </button>

            <button 
              onClick={() => { setActiveTab('manage'); resetMedForm(); }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold transition-all border text-left ${
                activeTab === 'manage' 
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg border-pink-400 translate-x-1' 
                  : 'bg-slate-800 text-pink-100 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-5 h-5 text-pink-300" />
                <div>
                  <div className="text-xs">แก้ไข / เพิ่มยาคนไข้</div>
                  <div className="text-[9px] text-pink-200/60 font-normal">เพิ่มยาชนิดใหม่ลงตารางรักษา</div>
                </div>
              </div>
            </button>

            <button 
              onClick={() => { setActiveTab('config'); }}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-bold transition-all border text-left ${
                activeTab === 'config' 
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg border-pink-400 translate-x-1' 
                  : 'bg-slate-800 text-pink-100 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-pink-300" />
                <div>
                  <div className="text-xs">วิธีใช้และคู่มือเชื่อมชีต</div>
                  <div className="text-[9px] text-pink-200/60 font-normal">ข้อมูลจับคู่ตาราง Google Sheets ปัจจุบัน</div>
                </div>
              </div>
            </button>

          </div>

        </div>

        {/* ================= RIGHT COLUMN: INTERACTIVE VIEWPORTS ================= */}
        <div className="lg:col-span-8">
          
          {/* ================= TAB 1: DASHBOARD (ยาทั้งหมด แยกตามกลุ่มอาการโรค) ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header section with real-time search */}
              <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80 shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                  <div>
                    <h2 className="text-2xl font-black text-white flex items-center space-x-2">
                      <Folder className="w-6 h-6 text-pink-400" />
                      <span>รายการยาของคุณ: {patient.name}</span>
                    </h2>
                    <p className="text-xs text-slate-400">เลือกคลิกที่โรคประจำตัวด้านล่าง เพื่อคัดกรองเฉพาะยาที่รักษาโรคนั้น ๆ</p>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อยา เช่น Metformin..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:border-pink-500 text-slate-100 placeholder-slate-550"
                    />
                  </div>
                </div>
              </div>

              {/* Group by Diseases Grid */}
              <div>
                <h3 className="text-sm font-bold text-pink-300 mb-3 flex items-center space-x-1.5 uppercase tracking-wide">
                  <Layers3 className="w-4 h-4" />
                  <span>จัดกลุ่มแยกตามโรคประจำตัวคนไข้</span>
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button 
                    onClick={() => setSelectedDisease(null)}
                    className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden ${
                      selectedDisease === null 
                        ? 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-100 border-pink-400 shadow-md' 
                        : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-extrabold text-xs mb-1">ยาทั้งหมด</div>
                    <div className="text-[10px] opacity-60 font-semibold">{medicines.length} รายการ</div>
                  </button>

                  {availableDiseases.map((disease) => {
                    const count = medicines.filter(m => m.disease === disease).length;
                    const isSelected = selectedDisease === disease;
                    return (
                      <button 
                        key={disease}
                        onClick={() => setSelectedDisease(disease)}
                        className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden ${
                          isSelected 
                            ? 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-100 border-pink-400 shadow-md' 
                            : 'bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <div className="font-extrabold text-xs mb-1 truncate">{disease}</div>
                        <div className="text-[10px] opacity-60 font-semibold">{count} รายการ</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medicines Cards Area */}
              <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/80">
                <div className="flex justify-between items-center mb-4 border-b border-slate-700/60 pb-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedDisease ? `ยาสำหรับอาการ: ${selectedDisease}` : "แสดงยาทั้งหมดของคนไข้"}
                  </h3>
                </div>

                {(() => {
                  const filtered = medicines.filter(m => {
                    const matchesDisease = selectedDisease ? m.disease === selectedDisease : true;
                    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                          m.disease.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesDisease && matchesSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-650" />
                        <p className="text-xs">ไม่พบข้อมูลรายชื่อยานี้ลงทะเบียนในระบบ</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filtered.map((med) => (
                        <div 
                          key={med.id}
                          className="bg-pink-50 text-slate-800 rounded-2xl p-5 border-2 border-pink-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-pink-300 transition-all"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="bg-pink-200 text-pink-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                {med.disease}
                              </span>
                              {med.barcode && (
                                <span className="bg-slate-200 text-slate-600 text-[9px] px-2 py-0.5 rounded font-mono">
                                  [Barcode: {med.barcode}]
                                </span>
                              )}
                            </div>

                            <h4 className="text-lg font-black text-slate-950 leading-tight">
                              {med.name}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
                              <div>
                                <span className="text-slate-500 block font-bold">ขนาดที่ต้องทาน:</span>
                                <span className="font-bold text-slate-800">{med.dosage || "-"}</span>
                              </div>
                              <div>
                                <span className="text-red-500 block font-bold">⚠️ วิธีการกิน / ข้อห้ามแพทย์:</span>
                                <span className="font-bold text-slate-800 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded inline-block">
                                  {med.instructions || "ระบุตามหน้าซองยา"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
                              <Clock className="w-3.5 h-3.5 text-pink-500" />
                              <span className="font-bold">เวลาทานยา:</span>
                              <div className="flex gap-1">
                                {med.timeSlots.map(slot => (
                                  <span key={slot} className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[9px] font-bold">
                                    {slot}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {med.notes && (
                              <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100 italic">
                                บันทึกเสริม: {med.notes}
                              </p>
                            )}
                          </div>

                          {/* Pill display and configuration actions */}
                          <div className="flex flex-row md:flex-col items-center justify-center space-x-3 md:space-x-0 md:space-y-2 bg-white/95 p-4 rounded-xl border border-pink-200 self-stretch md:self-auto min-w-[125px]">
                            <span className="text-[10px] text-slate-400 font-bold">สัญลักษณ์ตัวยา</span>
                            
                            <div className="h-12 flex items-center justify-center">
                              <div className={`${med.pillColor} ${med.pillShape} border-2 shadow-sm flex items-center justify-center overflow-hidden`}>
                                <span className="text-[7px] opacity-25 font-bold">RX</span>
                              </div>
                            </div>

                            <div className="flex space-x-2 w-full pt-2">
                              <button 
                                onClick={() => handleEditMedStart(med)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-1 px-1.5 rounded text-[10px] font-bold transition flex justify-center items-center"
                              >
                                <Edit className="w-3 h-3 mr-1" /> แก้ไข
                              </button>
                              <button 
                                onClick={() => handleDeleteMed(med.name)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded transition"
                                title="ลบรายการยานี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          )}


          {/* ================= TAB 2: DETAILED DAILY SCHEDULE (ตารางจ่ายยาประจำวัน) ================= */}
          {activeTab === 'pillbox' && (
            <div className="space-y-6">
              
              <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center space-x-2">
                    <Calendar className="w-6 h-6 text-pink-400" />
                    <span>ตารางตรวจและเช็กยาของ: {patient.name}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    คลิกทำเครื่องหมายเมื่อจ่ายยาให้คนไข้ทานเรียบร้อย เพื่อป้องกันข้อผิดพลาดในการจ่ายยาซ้ำหรือตกหล่น
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    const confirmClear = window.confirm("ต้องการเริ่มบันทึกประวัติการทานของวันใหม่ใช่หรือไม่?");
                    if (confirmClear) {
                      setTakenTracker({});
                      triggerNotification("รีเซ็ตสถานะการทานประจำวันเรียบร้อยแล้ว");
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-650 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-600 font-bold transition self-start sm:self-center"
                >
                  เริ่มวันใหม่
                </button>
              </div>

              {/* Time Slots (เช้า, กลางวัน, เย็น, ก่อนนอน) */}
              <div className="space-y-6">
                {["เช้า", "กลางวัน", "เย็น", "ก่อนนอน"].map((slot) => {
                  const slotMeds = medicines.filter(m => m.timeSlots && m.timeSlots.includes(slot));
                  const today = new Date().toDateString();

                  return (
                    <div key={slot} className="bg-slate-800/40 rounded-3xl p-6 border-2 border-slate-700/80">
                      
                      {/* Section head */}
                      <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="p-1.5 bg-pink-500/20 text-pink-300 rounded-lg">
                            <Clock className="w-4 h-4" />
                          </span>
                          <h3 className="text-md font-extrabold text-pink-100">ช่วงเวลา: {slot}</h3>
                        </div>
                        <span className="bg-slate-700/60 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-bold">
                          ยาในเวลานี้: {slotMeds.length} เม็ด
                        </span>
                      </div>

                      {slotMeds.length === 0 ? (
                        <p className="text-xs text-slate-500 py-3 text-center italic">
                          คนไข้ไม่มีรายการยาที่ต้องกินในเวลานี้
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {slotMeds.map((med) => {
                            const key = `${today}-${slot}-${med.name}`;
                            const isTaken = !!takenTracker[key];
                            
                            return (
                              <div 
                                key={med.name}
                                className={`p-4 rounded-2xl border transition-all ${
                                  isTaken 
                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100' 
                                    : 'bg-slate-800 border-slate-700 hover:border-pink-500/30'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                                      <span className="bg-pink-900/40 text-pink-300 px-1.5 py-0.2 rounded font-bold">{med.disease}</span>
                                      <span>| โดส: {med.dosage}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-white">{med.name}</h4>
                                    <div className="text-xs text-amber-300 font-semibold">
                                      ⚠️ {med.instructions || "ทานตามใบสั่งแพทย์"}
                                    </div>
                                  </div>

                                  <div className={`${med.pillColor} ${med.pillShape} border flex-shrink-0 flex items-center justify-center`} title="ลักษณะยา">
                                    <span className="text-[6px] opacity-25 font-bold">RX</span>
                                  </div>
                                </div>

                                <div className="border-t border-slate-700/60 my-3"></div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400">
                                    {isTaken ? "✓ จ่ายยาสำเร็จ (ซิงก์แล้ว)" : "○ รอแจกจ่ายยา"}
                                  </span>

                                  <button 
                                    onClick={() => togglePillTaken(slot, med)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                                      isTaken 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                        : 'bg-pink-600 hover:bg-pink-700 text-white'
                                    }`}
                                  >
                                    {isTaken ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>กินยาแล้ว</span>
                                      </>
                                    ) : (
                                      <span>เช็กว่ากินยา</span>
                                    )}
                                  </button>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}


          {/* ================= TAB 3: REGISTER / EDIT MEDICINE FORM ================= */}
          {activeTab === 'manage' && (
            <div className="space-y-6">
              
              <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80">
                <h2 className="text-2xl font-black text-white flex items-center space-x-2">
                  <Plus className="w-6 h-6 text-pink-400" />
                  <span>{isEditingMed ? `แก้ไขรายละเอียด: ${medForm.originalName}` : "เพิ่มยาคนไข้ตัวใหม่เข้าระบบ"}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  กรอกข้อมูลยาเพื่ออัปเดตเข้าไปยังแฟ้มข้อมูลของคนไข้รายนี้บนคลาวด์และตารางการให้ยาประจำสัปดาห์
                </p>
              </div>

              {isSyncing && (
                <div className="bg-pink-900/40 border border-pink-500/40 rounded-2xl p-4 text-xs flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
                  <span>กำลังจัดระเบียบโครงสร้างยาและประมวลผลข้อมูลส่งกลับกูเกิลชีต...</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Inputs details */}
                <form onSubmit={handleMedSubmit} className="md:col-span-8 bg-slate-800/40 p-6 rounded-3xl border border-slate-700/80 space-y-4 text-slate-200">
                  
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-1">
                      ชื่อยา (และแบรนด์) <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น Metformin, Amlodipine..."
                      value={medForm.name}
                      onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                      className="w-full text-sm p-3 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-1">
                        รักษาอาการ / กลุ่มโรค
                      </label>
                      <select 
                        value={medForm.disease}
                        onChange={(e) => setMedForm({ ...medForm, disease: e.target.value })}
                        className="w-full text-sm p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                      >
                        {availableDiseases.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-1">
                        ขนาดรับประทาน (โดส)
                      </label>
                      <input 
                        type="text" 
                        placeholder="เช่น 500 มิลลิกรัม, 1 เม็ด"
                        value={medForm.dosage}
                        onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                        className="w-full text-sm p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Mock scanner simulation */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-2">
                    <label className="block text-xs font-bold text-pink-300">บาร์โค้ดกำกับผลิตภัณฑ์ยา</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="กรอกบาร์โค้ด"
                        value={medForm.barcode}
                        onChange={(e) => setMedForm({ ...medForm, barcode: e.target.value })}
                        className="flex-1 text-sm p-2 rounded-lg bg-slate-900 border border-slate-750 text-slate-100"
                      />
                      <button 
                        type="button" 
                        onClick={simulateBarcodeScan}
                        className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3 rounded-lg font-bold flex items-center space-x-1 transition"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>สแกนบาร์โค้ด</span>
                      </button>
                    </div>
                  </div>

                  {/* Time schedules checkbox toggler */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">
                      ความถี่ / เวลาจ่ายยา (ระบุได้หลายเวลา)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["เช้า", "กลางวัน", "เย็น", "ก่อนนอน"].map(slot => {
                        const checked = medForm.timeSlots && medForm.timeSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleTimeSlotToggle(slot)}
                            className={`p-2.5 rounded-xl border font-bold text-xs transition flex items-center justify-center space-x-1.5 ${
                              checked 
                                ? 'bg-pink-600 border-pink-500 text-white shadow-sm' 
                                : 'bg-slate-900 border-slate-750 text-slate-400'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{slot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-1">
                      วิธีทาน / ข้อกำหนดใบแพทย์
                    </label>
                    <input 
                      type="text" 
                      placeholder="เช่น หลังอาหารทันที, เคี้ยวให้ละเอียด..."
                      value={medForm.instructions}
                      onChange={(e) => setMedForm({ ...medForm, instructions: e.target.value })}
                      className="w-full text-sm p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                    />
                  </div>

                  {/* Visual Pill select presets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/55 p-4 rounded-xl border border-slate-750">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">
                        กำหนดสีเม็ดยา
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {colorsPreset.map(color => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setMedForm({ ...medForm, pillColor: color.value })}
                            className={`p-1.5 text-[10px] rounded border font-semibold flex items-center justify-center ${
                              medForm.pillColor === color.value 
                                ? 'border-pink-500 bg-slate-800 ring-1 ring-pink-500' 
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full mr-1 ${color.value.split(" ")[0]}`}></span>
                            {color.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">
                        กำหนดรูปทรง
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {shapesPreset.map(shape => (
                          <button
                            key={shape.name}
                            type="button"
                            onClick={() => setMedForm({ ...medForm, pillShape: shape.value })}
                            className={`p-1 text-[10px] rounded border font-semibold ${
                              medForm.pillShape === shape.value 
                                ? 'border-pink-500 bg-slate-800 ring-1 ring-pink-500' 
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {shape.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-1">
                      ข้อมูลบันทึกเสริม (เพิ่มเติม)
                    </label>
                    <textarea 
                      rows="2"
                      placeholder="เช่น ยามีความชื้นระวังการเก็บรักษา..."
                      value={medForm.notes}
                      onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
                      className="w-full text-sm p-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100"
                    ></textarea>
                  </div>

                  {/* Buttons submission */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold py-3 px-6 rounded-2xl shadow-lg transition transform active:scale-95"
                    >
                      {isEditingMed ? "✓ บันทึกปรับปรุงข้อมูล" : "+ ลงทะเบียนยาใหม่"}
                    </button>
                    {isEditingMed && (
                      <button
                        type="button"
                        onClick={resetMedForm}
                        className="bg-slate-700 hover:bg-slate-650 text-slate-200 font-bold py-3 px-6 rounded-2xl transition"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>

                </form>

                {/* Right side live preview card */}
                <div className="md:col-span-4">
                  <div className="bg-pink-100 text-slate-800 rounded-3xl p-6 border-4 border-pink-200 text-center flex flex-col items-center justify-center sticky top-24 shadow-md">
                    <span className="bg-pink-300 text-pink-900 text-[9px] font-black px-2.5 py-1 rounded-full uppercase mb-4 tracking-wider">
                      พรีวิวรูปทรงตัวยา
                    </span>

                    <div className="w-24 h-24 bg-white rounded-2xl shadow-inner border border-pink-200 flex items-center justify-center mb-4">
                      <div className={`${medForm.pillColor} ${medForm.pillShape} border-2 shadow-md flex items-center justify-center overflow-hidden`}>
                        <span className="text-[7px] opacity-25 font-bold">RX</span>
                      </div>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm truncate max-w-full">
                      {medForm.name || "ชื่อยาที่จะใช้บันทึก"}
                    </h4>
                    
                    <p className="text-xs text-slate-500 mt-1">
                      รักษา: <span className="font-bold text-pink-700">{medForm.disease}</span>
                    </p>

                    <div className="mt-4 border-t border-pink-200 w-full pt-3 text-left space-y-1.5 text-[11px] text-slate-600">
                      <div>ขนาด: <span className="font-bold text-slate-900">{medForm.dosage || "-"}</span></div>
                      <div>ช่วงเวลา: <span className="font-bold text-slate-900">{medForm.timeSlots ? medForm.timeSlots.join(", ") : "ไม่ได้ระบุ"}</span></div>
                      <div>วิธีใช้: <span className="font-bold text-red-600">{medForm.instructions || "-"}</span></div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 4: GOOGLE SHEETS SETUP & INSTRUCTIONS ================= */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700/80">
                <h2 className="text-2xl font-black text-white flex items-center space-x-2">
                  <Database className="w-6 h-6 text-pink-400" />
                  <span>ภาพรวมความสอดคล้องตาราง Google Sheets ของคุณ</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  วิเคราะห์ข้อมูลโครงสร้างตารางอ้างอิงตรงตาม Google Sheet ที่ผู้ใช้นำเสนอ
                </p>
              </div>

              {/* Integration Settings */}
              <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold text-pink-300">ปรับเปลี่ยน URL เชื่อมโยง Google Sheet API</h3>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-400">Google Web App Script URL</label>
                  <input 
                    type="text" 
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500 text-slate-100"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => testConnection(scriptUrl)}
                    className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-4 py-2 rounded-lg font-bold"
                  >
                    ทดสอบรับสัญญาณเชื่อมต่อ
                  </button>
                  {scriptUrl && (
                    <button 
                      onClick={() => {
                        setScriptUrl("");
                        localStorage.removeItem('caremed_script_url');
                        setConnectionStatus('disconnected');
                      }}
                      className="bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg border border-slate-650"
                    >
                      ตัดการเชื่อมต่อ
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 text-xs flex items-center space-x-2">
                  <span className="font-bold text-slate-400">สถานะ API ปัจจุบัน:</span>
                  {connectionStatus === 'connected' && (
                    <span className="text-emerald-400 font-semibold bg-emerald-950/40 px-2 rounded border border-emerald-500/30">
                      ✓ ซิงก์ฐานข้อมูลและตารางสำเร็จ
                    </span>
                  )}
                  {connectionStatus === 'disconnected' && (
                    <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      ทำงานในโหมดออฟไลน์
                    </span>
                  )}
                  {connectionStatus === 'testing' && (
                    <span className="text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                      กำลังติดต่อโฮสต์...
                    </span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="text-red-400 bg-red-950/20 px-2 py-0.5 rounded border border-red-500/30">
                      การเชื่อมต่อล้มเหลว
                    </span>
                  )}
                </div>
              </div>

              {/* Summary columns mappings */}
              <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold text-pink-300 flex items-center space-x-1.5">
                  <FileText className="w-5 h-5 text-pink-400" />
                  <span>โครงสร้างตารางที่ใช้จริงและแมปอย่างถูกต้อง</span>
                </h3>

                <p className="text-xs text-slate-300">
                  ระบบนี้พัฒนาขึ้นเพื่อทำงานสอดประสานกับโครงสร้างตารางเดิมของคุณ 100% โดยผู้ดูแลจะเข้าถึงเฉพาะข้อมูลคนไข้ที่ได้รับการแมปในแท็บ <strong className="text-pink-300">assignments</strong> เท่านั้น
                </p>

                <div className="space-y-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-pink-400 font-bold block mb-1">แท็บที่ 1: caregivers (ตรวจสอบผู้ดูแล)</span>
                    <p className="text-slate-400">คอลัมน์: Caregiver_ID, Name, Email, Password, Phone, Status</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-pink-400 font-bold block mb-1">แท็บที่ 2: patients (รายละเอียดผู้ป่วย)</span>
                    <p className="text-slate-400">คอลัมน์: Patient_ID, Patient_Name, Nickname, Age_Gender_DOB, National_ID, Medical_Conditions, Allergies, Precautions, ฯลฯ</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-pink-400 font-bold block mb-1">แท็บที่ 3: assignments (ตารางมอบหมายคนไข้ให้ผู้ดูแล)</span>
                    <p className="text-slate-400">คอลัมน์: Assignment_ID, Caregiver_ID, Caregiver_Name, Patient_ID, Patient_Name, Start_Date, Status</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-pink-400 font-bold block mb-1">แท็บที่ 4: medications (ทะเบียนและรายละเอียดเม็ดยา)</span>
                    <p className="text-slate-400">คอลัมน์: Patient_ID, Patient_Name, ชื่อยา (และยี่ห้อถ้ามี), รักษาอาการ / กลุ่มโรค, ขนาด / โดส, ข้อมูลสแกนบาร์โค้ด, เวลาที่ทาน, วิธีทาน / ข้อควรระวัง, ฯลฯ</p>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Mobile navigation bottom bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800/85 z-30 py-2 shadow-2xl">
        <div className="max-w-md mx-auto flex justify-around text-[10px] font-bold">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSelectedDisease(null); }}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'dashboard' ? 'text-pink-400' : 'text-slate-400'}`}
          >
            <Folder className="w-5 h-5" />
            <span>ยาทั้งหมด</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('pillbox'); setSelectedDisease(null); }}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'pillbox' ? 'text-pink-400' : 'text-slate-400'}`}
          >
            <Calendar className="w-5 h-5" />
            <span>ตารางเช็กยา</span>
          </button>

          <button 
            onClick={() => { setActiveTab('manage'); resetMedForm(); }}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'manage' ? 'text-pink-400' : 'text-slate-400'}`}
          >
            <Plus className="w-5 h-5" />
            <span>แก้ไข/เพิ่มยา</span>
          </button>

          <button 
            onClick={() => { setActiveTab('config'); }}
            className={`flex flex-col items-center space-y-1 ${activeTab === 'config' ? 'text-pink-400' : 'text-slate-400'}`}
          >
            <Database className="w-5 h-5" />
            <span>คลาวด์และคู่มือ</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
