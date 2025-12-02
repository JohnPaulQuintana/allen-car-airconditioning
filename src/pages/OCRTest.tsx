import { useState, useRef, useEffect } from "react";
import { Camera, X, RefreshCw, History, Calendar, CheckCircle, AlertCircle, Clock, User, Tag, FileText } from "lucide-react";

export default function OCRTest() {
  // Core states
  const [plate, setPlate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // History display state
  const [serviceHistory, setServiceHistory] = useState<Array<{
    date: string;
    repairs: Array<{
      id: string;
      service: string;
      parts: string[];
      cost: number;
      technician: string;
      status: "completed" | "in-progress" | "pending";
      timestamp: string;
      invoiceNumber: string;
      vehicleDetails?: {
        make: string;
        model: string;
        year: number;
        color: string;
      };
    }>;
    totalCost: number;
    visitNumber: number;
  }>>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- OCR API ---
  const recognizePlateWithAPI = async (file: File) => {
    setIsProcessing(true);
    setPlate("Processing...");
    setDebugInfo("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_OCR_API_KEY },
        body: formData,
      });

      const data = await res.json();
      const text = data.ParsedResults?.[0]?.ParsedText || "";

      setDebugInfo(`API returned: "${text.substring(0, 100)}..."`);

      const foundPlate = extractPlateFromText(text);
      if (foundPlate) {
        setPlate(`✅ ${foundPlate}`);
        // Simulate API call to fetch service history for this plate
        fetchServiceHistory(foundPlate);
      } else {
        setPlate("❌ No plate detected");
      }
    } catch (error) {
      console.error(error);
      setDebugInfo(`Error: ${error}`);
      setPlate("❌ API Error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate fetching service history from API
  const fetchServiceHistory = async (plateNumber: string) => {
    setDebugInfo(`Fetching service history for ${plateNumber}...`);
    
    // Mock API response with realistic data
    setTimeout(() => {
      const mockHistory = [
        {
          date: "2024-01-15",
          repairs: [
            {
              id: "1",
              service: "AC Compressor Replacement",
              parts: ["Compressor Denso 1234", "R134a Refrigerant 500g", "O-ring Kit"],
              cost: 18500,
              technician: "Juan Dela Cruz",
              status: "completed",
              timestamp: "10:30 AM",
              invoiceNumber: "INV-2024-0015",
              vehicleDetails: {
                make: "Toyota",
                model: "Vios",
                year: 2020,
                color: "White"
              }
            },
            {
              id: "2",
              service: "Cooling System Flush",
              parts: ["Premium Coolant 2L", "Flush Solution"],
              cost: 2500,
              technician: "Maria Santos",
              status: "completed",
              timestamp: "11:45 AM",
              invoiceNumber: "INV-2024-0016"
            }
          ],
          totalCost: 21000,
          visitNumber: 1
        },
        {
          date: "2023-11-22",
          repairs: [
            {
              id: "3",
              service: "Brake System Overhaul",
              parts: ["Brake Pads Front", "Brake Rotors", "Brake Fluid DOT4"],
              cost: 8500,
              technician: "Pedro Reyes",
              status: "completed",
              timestamp: "2:15 PM",
              invoiceNumber: "INV-2023-1122"
            },
            {
              id: "4",
              service: "Tire Rotation & Balance",
              parts: ["Wheel Weights"],
              cost: 1200,
              technician: "Maria Santos",
              status: "completed",
              timestamp: "3:30 PM",
              invoiceNumber: "INV-2023-1123"
            }
          ],
          totalCost: 9700,
          visitNumber: 2
        },
        {
          date: "2023-08-10",
          repairs: [
            {
              id: "5",
              service: "Oil Change Service",
              parts: ["Synthetic Oil 5W-30 4L", "Oil Filter", "Drain Plug Gasket"],
              cost: 3200,
              technician: "Juan Dela Cruz",
              status: "completed",
              timestamp: "9:00 AM",
              invoiceNumber: "INV-2023-0810"
            },
            {
              id: "6",
              service: "Engine Tune-up",
              parts: ["Spark Plugs x4", "Air Filter", "Fuel Injector Cleaner"],
              cost: 4500,
              technician: "Pedro Reyes",
              status: "completed",
              timestamp: "10:15 AM",
              invoiceNumber: "INV-2023-0811"
            }
          ],
          totalCost: 7700,
          visitNumber: 3
        }
      ];
      
      setServiceHistory(mockHistory as typeof serviceHistory);
      setDebugInfo(`Found ${mockHistory.length} service visits`);
    }, 1000);
  };

  const extractPlateFromText = (text: string): string | null => {
    const upperText = text.toUpperCase();
    const patterns = [
      /[A-Z]{3}[0-9]{4}/,
      /[A-Z]{2}[0-9]{5}/,
      /[A-Z]{2}[0-9]{4}/,
      /[A-Z]{3}[0-9]{3}/,
      /[A-Z]{2,3}\s*[0-9]{3,4}/,
      /[A-Z]{2,3}-[0-9]{3,4}/,
    ];

    for (const pattern of patterns) {
      const match = upperText.match(pattern);
      if (match) return match[0].replace(/[^A-Z0-9]/g, "");
    }
    return null;
  };

  // --- Camera Control ---
  const enableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported");
      return;
    }

    setCameraError(null);
    setDebugInfo("Requesting camera...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraEnabled(true);
        setDebugInfo("✅ Camera ready");
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Camera access denied");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) {
      setDebugInfo("Camera not ready");
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setDebugInfo("Video not ready");
      return;
    }

    // Crop for better plate detection
    const canvas = document.createElement("canvas");
    const cropHeight = video.videoHeight * 0.6;
    const cropY = video.videoHeight * 0.2;
    
    canvas.width = video.videoWidth;
    canvas.height = cropHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setDebugInfo("Canvas error");
      return;
    }

    ctx.drawImage(video, 0, cropY, video.videoWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    
    const imgURL = canvas.toDataURL("image/jpeg", 0.9);
    setImage(imgURL);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        await recognizePlateWithAPI(file);
      }
    }, "image/jpeg", 0.9);
  };

  const disableCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  };

  const resetAll = () => {
    setPlate("");
    setImage(null);
    setDebugInfo("");
    setCameraError(null);
    setServiceHistory([]);
    disableCamera();
  };

  // Calculate totals
  const totalVisits = serviceHistory.length;
  const totalSpent = serviceHistory.reduce((sum, visit) => sum + visit.totalCost, 0);
  const totalServices = serviceHistory.reduce((sum, visit) => sum + visit.repairs.length, 0);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Camera className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Plate Scanner</h1>
              <p className="text-xs text-gray-400">Vehicle Service History</p>
            </div>
          </div>
          <button
            onClick={resetAll}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
            title="Reset"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-24">
        {/* Camera Section */}
        <section className="py-6">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video mb-4">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraEnabled ? '' : 'hidden'}`}
            //   style={{ transform: 'scaleX(-1)' }}
            />
            {!cameraEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400">Camera disabled</p>
                  <p className="text-sm text-gray-500 mt-1">Tap Enable Camera to start</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 border-2 border-dashed border-yellow-500/30 pointer-events-none rounded-2xl"></div>
            
            {/* Plate detection guide */}
            {/* <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <p className="text-sm">Center license plate in frame</p>
              </div>
            </div> */}
          </div>

          {/* Camera Controls */}
          <div className="flex flex-col gap-3">
            {!cameraEnabled ? (
              <button
                onClick={enableCamera}
                className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-lg font-semibold w-full active:scale-[0.98] transition-transform"
              >
                <Camera className="w-6 h-6" />
                Enable Camera
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-white"></div>
                        </div>
                        <div className="absolute -inset-1 rounded-full bg-white/10 animate-ping"></div>
                      </div>
                      Capture Plate
                    </>
                  )}
                </button>
                <button
                  onClick={disableCamera}
                  className="px-6 py-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl border border-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {cameraError && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-300 font-medium">Camera Error</p>
                    <p className="text-red-400/80 text-sm mt-1">{cameraError}</p>
                    <button
                      onClick={enableCamera}
                      className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Detection Results */}
        {plate && (
          <section className="mb-8">
            <div className={`rounded-2xl p-5 text-center transition-all duration-300 ${
              plate.includes("✅") 
                ? "bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-800/30 shadow-lg shadow-green-900/10" 
                : plate.includes("❌") 
                ? "bg-gradient-to-r from-red-900/20 to-rose-900/10 border border-red-800/30"
                : "bg-gray-800/30 border border-gray-700"
            }`}>
              <div className="text-3xl font-mono mb-2 tracking-wider font-bold">
                {plate.includes("✅") ? (
                  <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                    {plate.replace("✅ ", "")}
                  </span>
                ) : plate.replace("❌ ", "") || "--- ---"}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                {plate.includes("✅") ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">License plate detected</span>
                  </>
                ) : plate.includes("❌") ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">No plate detected</span>
                  </>
                ) : (
                  <span className="text-gray-400">Ready to scan</span>
                )}
              </div>
            </div>

            {/* Captured Image */}
            {image && plate.includes("✅") && (
              <div className="mt-6 bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <h3 className="font-semibold">Captured Image</h3>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-gray-700">
                  <img
                    src={image}
                    alt="Captured license plate"
                    className="w-full"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs">
                    📸 Scan Complete
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Service History Section */}
        {serviceHistory.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <History className="w-5 h-5 text-blue-400" />
                  </div>
                  Service History
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {plate.replace("✅ ", "")} • {totalVisits} visit{totalVisits !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">₱{totalSpent.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Total spent</div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/30">
                <div className="text-2xl font-bold">{totalVisits}</div>
                <div className="text-xs text-gray-400 mt-1">Visits</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/30">
                <div className="text-2xl font-bold">{totalServices}</div>
                <div className="text-xs text-gray-400 mt-1">Services</div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/30">
                <div className="text-2xl font-bold">{serviceHistory[0].repairs[0].vehicleDetails?.year || 'N/A'}</div>
                <div className="text-xs text-gray-400 mt-1">Year</div>
              </div>
            </div>

            {/* History Timeline */}
            <div className="space-y-4">
              {serviceHistory.map((visit) => (
                <div key={visit.date} className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/50">
                  {/* Visit Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold">{formatDate(visit.date)}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-3 h-3" />
                          Visit #{visit.visitNumber}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">₱{visit.totalCost.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{visit.repairs.length} service{visit.repairs.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {/* Repairs List */}
                  <div className="space-y-4">
                    {visit.repairs.map((repair) => (
                      <div key={repair.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-lg mb-1">{repair.service}</div>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {repair.technician}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {repair.timestamp}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                repair.status === 'completed' 
                                  ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
                                  : repair.status === 'in-progress'
                                  ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50'
                                  : 'bg-gray-800 text-gray-400 border border-gray-700'
                              }`}>
                                {repair.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-400">₱{repair.cost.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Invoice: {repair.invoiceNumber}</div>
                          </div>
                        </div>

                        {/* Parts Used */}
                        {repair.parts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-700/30">
                            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                              <Tag className="w-4 h-4" />
                              Parts Used
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {repair.parts.map((part, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-3 py-1.5 bg-gray-800/70 rounded-lg text-sm border border-gray-700/50"
                                >
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-5 border border-gray-700/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Service Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">First Service</div>
                  <div className="font-medium">{formatDate(serviceHistory[serviceHistory.length - 1].date)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Latest Service</div>
                  <div className="font-medium">{formatDate(serviceHistory[0].date)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Average per Visit</div>
                  <div className="font-medium text-green-400">
                    ₱{Math.round(totalSpent / totalVisits).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Customer Since</div>
                  <div className="font-medium">
                    {new Date(serviceHistory[serviceHistory.length - 1].date).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Debug Info (Collapsible) */}
        <div className="mt-8 bg-black/40 rounded-2xl overflow-hidden border border-gray-800">
          <details>
            <summary className="p-4 font-medium flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Debug Information
              </span>
              <div className="text-gray-400 text-sm">Tap to {debugInfo ? 'show' : 'hide'}</div>
            </summary>
            <div className="p-4 border-t border-gray-800">
              <pre className="text-green-300/80 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                {debugInfo || "No debug information available"}
              </pre>
            </div>
          </details>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 p-3">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
          <button
            onClick={enableCamera}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
              cameraEnabled 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-800/30' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-xs">Camera</span>
          </button>
          
          <button
            onClick={capturePhoto}
            disabled={!cameraEnabled || isProcessing}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 disabled:from-gray-800 disabled:to-gray-900 disabled:text-gray-500"
          >
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 mb-1 animate-spin" />
            ) : (
              <>
                <div className="w-5 h-5 mb-1 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                </div>
              </>
            )}
            <span className="text-xs">{isProcessing ? 'Scanning...' : 'Scan Plate'}</span>
          </button>
          
          <button
            onClick={resetAll}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-800/50 text-gray-400 hover:bg-gray-800"
          >
            <RefreshCw className="w-5 h-5 mb-1" />
            <span className="text-xs">Reset</span>
          </button>
        </div>
      </nav>
    </div>
  );
}