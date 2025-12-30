import React from 'react';
import { useOnePatientRaw, useMultiPatientRaw } from '../hooks/useTemporalData';

const StepOneDemo: React.FC = () => {
    const { data: singleData, loading: singleLoading, error: singleError } = useOnePatientRaw();
    const { data: multiData, loading: multiLoading, error: multiError } = useMultiPatientRaw();

    return (
        <div className="p-8 space-y-8 font-sans">
            <h1 className="text-2xl font-bold">Step 1 Demo: Data Fetching</h1>

            {/* Single Patient Section */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Single Patient Data (GET /getAllOnePatientRaw)</h2>
                {singleLoading && <div className="text-blue-600">Loading...</div>}
                {singleError && <div className="text-red-600">Error: {singleError.message}</div>}
                {!singleLoading && !singleError && (
                    <div>
                        <p className="mb-2"><strong>Total Rows:</strong> {singleData.length}</p>
                        <div className="bg-gray-800 text-white p-4 rounded overflow-auto font-mono text-sm">
                            <h3 className="text-gray-400 mb-1">// First row example</h3>
                            {singleData.length > 0
                                ? JSON.stringify(singleData[0], null, 2)
                                : 'No data found'}
                        </div>
                    </div>
                )}
            </div>

            {/* Multi Patient Section */}
            <div className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-2">Multi Patient Data (GET /getAllMultiPatientRaw)</h2>
                {multiLoading && <div className="text-blue-600">Loading...</div>}
                {multiError && <div className="text-red-600">Error: {multiError.message}</div>}
                {!multiLoading && !multiError && (
                    <div>
                        <p className="mb-2"><strong>Total Rows:</strong> {multiData.length}</p>
                        <div className="bg-gray-800 text-white p-4 rounded overflow-auto font-mono text-sm">
                            <h3 className="text-gray-400 mb-1">// First row example</h3>
                            {multiData.length > 0
                                ? JSON.stringify(multiData[0], null, 2)
                                : 'No data found'}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StepOneDemo;
