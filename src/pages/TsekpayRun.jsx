import { useEffect, useRef, useState } from "react";
import NoRecord from "../components/NoRecord";
import * as XLSX from "xlsx";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import DropdownCompany from "../components/DropdownCompany.jsx";

function TsekpayRun() {
  const navigate = useNavigate();
  const userData = Cookies.get("userData");
  const accountID = JSON.parse(userData).id;
  const [companyID, setCompanyID] = useState(null);
  const [dbCategoryPayItem, setDatabase] = useState([]);
  const [categories, setCategories] = useState([]);
  const [payables, setPayables] = useState([]);
  const [payItem, setPayItem] = useState({});
  const [dataUploaded, setDataUploaded] = useState([]); // Uploaded Excel
  const [tableHeader, setTableHeader] = useState([]); //Headers for the table
  const [selectAll, setSelectAll] = useState(false);
  const [reqInfo, setReqInfo] = useState(["Employee ID", "Last Name", "First Name", "Middle Name", "Email"]);
  const [payrollDates, setPayrollDates] = useState({
    dateFrom: "",
    dateTo: "",
    datePayment: ""
  });

  useEffect(() => {
    if (!userData) {
      // Redirect to the login page if there is no cookie
      navigate("/login");
    }
    getCompanyPayItem(accountID);
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  // Get token from userData cookie
  const getToken = () => {
    const userData = JSON.parse(Cookies.get("userData"));
    return userData.token;
  };
  //const checkbox = useRef(null);

  const handleFileUpload = (e) => {
    const reader = new FileReader();
    reader.readAsBinaryString(e.target.files[0]);
    reader.onload = (e) => {
      const data = e.target.result;

      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);
      const headers = Object.keys(parsedData[0]);

      // Check if required information is equal to the the spreadsheet headers
      const areEqual = JSON.stringify(headers) == JSON.stringify(reqInfo); 
      console.log("Are arrays equal:", areEqual);
      if (areEqual) {
        //Notification for successful upload
        toast.success('File Upload Successfully!', { autoClose: 3000 });
        setDataUploaded(parsedData);
        setTableHeader(headers);
      } else {
        //Notification for failed upload
        toast.success('File Upload Failed!', { autoClose: 3000 });
      }
    };
  };

  const [selectedRow, setSelectedRow] = useState(null);

  const handleNameClick = (rowData) => {
    // rowData is the data of the selected row
    console.log("Selected Row Data:", rowData);
    setSelectedRow(rowData);
  };

  const companyChange = (selectedCompany) => {
    if(selectedCompany != null){
      setCompanyPayItem(selectedCompany);
      setCompanyID(selectedCompany);
    }
  }
  
  const getCompanyPayItem = async (accountID) => {
    const token = getToken();
    await axios.get(`http://localhost:3000/pay-item/data/${accountID}`, {
      headers: {
        Authorization: token,
      },
    })
    .then(function(response){
      const rows = response.data.rows;
      if (rows) {
        setDatabase(rows);
      }
    })
    .catch(function(error){
      console.error("Error: ", error);
    })
  }

  const setCompanyPayItem = (id) => {
    setReqInfo(["Employee ID", "Last Name", "First Name", "Middle Name", "Email"]);

    const data = dbCategoryPayItem.filter((item) => item.company_id == id);
    console.log("Set Company Pay Item: ", data);

    // Transform the data array
    const transformedData = data.reduce((acc, item) => {
      const { category, name } = item;

      // Find the category object in the accumulator
      const categoryObject = acc.find(obj => obj[category]);

      if (categoryObject) {
        // If the category exists, push the name to its array
        categoryObject[category].push(name);
      } else {
        // If the category doesn't exist, create a new object
        acc.push({ [category]: [name] });
      }
      return acc;
    }, []);

    setCategories(transformedData);
    const values = transformedData.flatMap(obj => Object.values(obj)[0]);
    setPayables(values);
    setReqInfo(prevInfo => [...prevInfo, ...values]);
  }

  const prepareDataForPDFGeneration = () => {
    //Append data to uploaded data
    const datesAppended =  dataUploaded.map(i => ({
      ...i,
      payrollDates
      }
    ));
    
    const data = datesAppended;
    // Iterate through the data object
    data.forEach(item => {
      // Iterate trhough the categories object
      categories.forEach(category => {
        const categoryName = Object.keys(category)[0]; // Get categories
        const categoryKeys = category[categoryName]; // Get items under categories

        const categoryItems = {}; // Initialize object for holding category items
        let categoryTotal = 0; // Initialize variable for handling total of the category
    
        // Iterate through the items in the category
        categoryKeys.forEach(key => {
          if (item[key] !== undefined) { //check if item has value
            categoryItems[key] = item[key]; // Add item to category object
            categoryTotal += item[key]; // Add item value to category total
            delete item[key]; // Remove the item from the main object to avoid duplication
          }
        });
    
        // Add the grouped items and their total to the item under the category name
        item[categoryName] = { ...categoryItems, Total: categoryTotal };
      });
    });
    
    console.log("Processed Data,", data);

  };

  const generatePDF = () => {
    
  };

  return (
    <>
      <ToastContainer
      position="top-center"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      />

      <div className="flex lg:flex-row flex-col justify-between">
        <h1 className="m-2 p-2 md:m-5 md:px-5 text-3xl font-bold">Tsekpay Run</h1>
        <div className="m-2 p-2 md:m-5 md:px-5 lg:mr-10 my-1 flex flex-col">
          <h3 className="text-[13px] font-regular text-white">Client</h3>
          <DropdownCompany companyID = {companyChange}></DropdownCompany>
        </div>
      </div>

      <form className="flex lg:flex-row flex-col m-2 p-2 border-2 border-gray-200 border-solid rounded-lg">

      <div className="container flex flex-col lg:w-[75%]">
          <h1 className="text-base font-bold">Period Covered</h1>
          <div className="flex lg:flex-row flex-col">
            <label className="form-control w-full max-w-xs mx-3">
              <div className="label">
                <span className="label-text font-medium text-sm">
                  Date From
                </span>
              </div>
              <input
                type="date"
                className="input input-bordered w-full max-w-xs"
                onChange={(e) => {
                  setPayrollDates((prevPayrollDate) => ({
                  ...prevPayrollDate, 
                  dateFrom: e.target.value
                }));
                }}
              />
            </label>
            <label className="form-control w-full max-w-xs mx-3">
              <div className="label">
                <span className="label-text font-medium text-sm">Date To</span>
              </div>
              <input
                type="date"
                className="input input-bordered w-full max-w-xs"
                onChange={(e) => {
                  setPayrollDates((prevPayrollDate) => ({
                  ...prevPayrollDate, 
                  dateTo: e.target.value
                }));
                }}
              />
            </label>
          </div>
          <label className="form-control w-full max-w-xs mx-3">
            <div className="label">
              <span className="label-text font-medium text-sm">
                Payment Date
              </span>
            </div>
            <input
              type="date"
              className="input input-bordered w-full max-w-xs"
              onChange={(e) => {
                setPayrollDates((prevPayrollDate) => ({
                ...prevPayrollDate, 
                datePayment: e.target.value
              }));
              }}
            />
          </label>
        </div>
        <div className="divider md:divider-vertical lg:divider-horizontal "></div>
        <div className="flex flex-col  container lg:w-[25%] ">
          <label
            htmlFor="uploadFile1"
            className="btn bg-[#426E80] btn-wide shadow-md px-2 lg:px-4 m-2 my-2 text-white hover:bg-[#AAE2EC] hover:text-[#426E80]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 mr-2 fill-white inline"
              viewBox="0 0 32 32"
            >
              <path
                d="M23.75 11.044a7.99 7.99 0 0 0-15.5-.009A8 8 0 0 0 9 27h3a1 1 0 0 0 0-2H9a6 6 0 0 1-.035-12 1.038 1.038 0 0 0 1.1-.854 5.991 5.991 0 0 1 11.862 0A1.08 1.08 0 0 0 23 13a6 6 0 0 1 0 12h-3a1 1 0 0 0 0 2h3a8 8 0 0 0 .75-15.956z"
                data-original="#000000"
              />
              <path
                d="M20.293 19.707a1 1 0 0 0 1.414-1.414l-5-5a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 1.414 1.414L15 16.414V29a1 1 0 0 0 2 0V16.414z"
                data-original="#000000"
              />
            </svg>
            Upload Payroll File
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              id="uploadFile1"
              className="hidden"
              name="csvFile"
            />
          </label>

          <button
            className="btn bg-[#5C9CB7] btn-wide shadow-md px-5 m-2  "
            disabled="disabled"
          >
            Payslip PDF Format
          </button>

          <button
            type="button"
            className="btn bg-[#5C9CB7] btn-wide shadow-md px-4 m-2 "
            onClick={prepareDataForPDFGeneration}
          >
            Generate & Send Payslip
          </button>
        </div>
      </form>

      {selectedRow && (
        <div className=" flex flex-col">
          <div className="m-2 border-2 border-gray-200 border-solid rounded-lg flex flex-col mx-10">
            <div className="bg-[#4A6E7E] text-white rounded-t-lg w-full flex flex-col">
              <h1 className="font-bold text-2xl py-3 mx-3">
                {selectedRow["Name"]}
              </h1>
              <div className="flex flex-col lg:flex-row my-3">
                <h2 className="mx-4">
                  <strong>Email: </strong>
                  {selectedRow["Email Address"]}
                </h2>
                <h2 className="mx-4">
                  <strong>Tax Number: </strong>
                  {selectedRow["Tin"]}
                </h2>
                <h2 className="mx-4">
                  <strong>Ordinary Rate: </strong>000000000000
                </h2>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row">
              <div className="w-full">
                <h1 className="font-bold mx-3 mt-3">Pay Calculation</h1>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="font-bold mx-3 mt-3">Earnings</h1>
                  <h1 className="font-bold mx-3 mt-3">Amount PHP</h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Basic Pay</h1>
                  <h1 className="mx-3 mt-3">{selectedRow["Basic Pay"]}</h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">
                    Clothing and Laundry Allowance (de minimis)
                  </h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Clothing and Laundry Allowance (de minimis)"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Meal Allowance (taxable)</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Meal Allowance (taxable)"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Medical Allowance (De minimis)</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Medical Allowance (De minimis)"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Medical Allowance (Taxable)</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Medical Allowance (Taxable)"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Rice Allowance (De minimis)</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["RIce Allowance (De minimis)"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="font-bold mx-3 mt-3">Total Earnings</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Basic Pay"] +
                      selectedRow["Meal Allowance (taxable)"] +
                      selectedRow["Medical Allowance (De minimis)"] +
                      selectedRow["Medical Allowance (Taxable)"] +
                      selectedRow[
                        "Clothing and Laundry Allowance (de minimis)"
                      ] +
                      selectedRow["RIce Allowance (De minimis)"]}
                  </h1>
                </div>

                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="font-bold mx-3 mt-3">Deductions</h1>
                  <h1 className="font-bold mx-3 mt-3">Amount PHP</h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">SSS (every Payroll)</h1>
                  <h1 className="mx-3 mt-3">
                    {" "}
                    {selectedRow["SSS (every Payroll)"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">PHIC (every Payroll)</h1>
                  <h1 className="mx-3 mt-3">0</h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">HDMF (every Payroll)</h1>
                  <h1 className="mx-3 mt-3">0</h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Absences</h1>
                  <h1 className="mx-3 mt-3">{selectedRow["Absences"]}</h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="mx-3 mt-3">Salary Deduction</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Salary Deduction"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="font-bold mx-3 mt-3">Total Deduction</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["SSS (every Payroll)"] -
                      selectedRow["Absences"] -
                      selectedRow["Salary Deduction"]}{" "}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
                <div className="flex flex-row justify-between">
                  <h1 className="font-bold mx-3 mt-3">Take Home Pay</h1>
                  <h1 className="mx-3 mt-3">
                    {selectedRow["Basic Pay"] +
                      selectedRow["Meal Allowance (taxable)"] +
                      selectedRow["Medical Allowance (De minimis)"] +
                      selectedRow["Medical Allowance (Taxable)"] +
                      selectedRow[
                        "Clothing and Laundry Allowance (de minimis)"
                      ] +
                      selectedRow["RIce Allowance (De minimis)"] -
                      selectedRow["SSS (every Payroll)"] -
                      selectedRow["Absences"] -
                      selectedRow["Salary Deduction"]}
                  </h1>
                </div>
                <hr className="mt-1"></hr>
              </div>
              {/* <div className="divider divider-horizontal"></div> */}
            </div>
          </div>
        </div>
      )}

      <h1 className="m-5 px-5 text-l font-bold">Payroll File</h1>
      <div className="m-2 border-2 border-gray-200 border-solid rounded-lg flex flex-row mx-10">
        {dataUploaded.length > 0 ? (
          <div className="overflow-x-auto overflow-scroll h-[55vh]">
            <table className="table table-xs">
              <thead className="bg-[#4A6E7E] text-white sticky top-0">
                <tr>
                  <th>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox bg-[#fff] my-2"
                      />
                    </label>
                  </th>
                  {Object.keys(dataUploaded[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataUploaded.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <label>
                        <input type="checkbox" className="checkbox" />
                      </label>
                    </td>
                    {Object.values(row).map((value, index) => (
                      <td key={index}>
                        <button onClick={() => handleNameClick(row)}>
                          {value}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <NoRecord></NoRecord>
        )}
      </div>
    </>
  );
}

export default TsekpayRun;
