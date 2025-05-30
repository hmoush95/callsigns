import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from '../css/tailwindStylesLiterals';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import DialogPlay from '../components/DialogPlay.js';
import DialogHTP from '../components/DialogHTP';
import { useSocketContext } from '../contexts/SocketContext';

function Home() {

	const location = useLocation();

	const [socket, setSocket] = useSocketContext();

	const [playOpen, setPlayOpen] = useState(false);

	const [htpOpen, setHTPOpen] = useState(false);

	const htpToPlay = () => {

		setHTPOpen(false);

		setPlayOpen(true);

	}

	return (

		<div className="flex relative min-h-screen w-screen justify-center bg-black overflow-hidden">
			<div className="aspect-square h-[170%] sm:h-[170%] md:h-[150%] lg:h-[180%] xl:h-[170%] absolute top-[-35%] sm:top-[-35%] md:top-[-25%] lg:top-[-40%] xl:top-[-35%] flex items-center justify-center rounded-full bg-gradient-to-bl from-[#040a14] to-[#030a14] shadow-inner shadow-red-700">
				<div className="aspect-square h-[93%] sm:h-[93%] md:h-[90%] lg:h-[92%] xl:h-[93%] flex items-center justify-center rounded-full bg-gradient-to-bl from-[#020b1d] to-[#020811] shadow-inner shadow-red-600">
					<div className="aspect-square h-[92%] sm:h-[92%] md:h-[89%] lg:h-[91%] xl:h-[92%] flex items-center justify-center rounded-full bg-gradient-to-bl from-[#061227] to-[#02060e] shadow-inner shadow-red-600">
						<div className="aspect-square h-[91%] sm:h-[91%] md:h-[87%] lg:h-[90%] xl:h-[91%] flex items-center justify-center rounded-full bg-gradient-to-tr from-slate-950 from-30% via-slate-800 via-75% to-red-700 to-100% shadow-inner shadow-red-500">

							{/* Main Content Container */}
							<div className="w-screen max-w-[75%] md:max-w-[576px] lg:max-w-[900px] 2xl:max-w-[900px] mx-auto">

								<div className="flex md:flex-row flex-col items-center md:items-end justify-between mb-8 gap-4 px-6">
									<div className='flex flex-row gap-4'>
										<h1 className="text-slate-50 font-semibold lg:text-7xl text-5xl">Callsigns</h1>
										<h1 className="lg:text-7xl text-5xl">📡</h1>
									</div>
										
									<div className="flex gap-8 items-center">

										<DialogPlay tailwindStyles={"flex-1 sm:flex-none min-w-[120px] sm:w-32 bg-green-600 text-slate-50 hover:bg-green-600/80 active:bg-green-500"} triggerName={"Play"} isOpen={[playOpen, setPlayOpen]} />

										<DialogHTP tailwindStyles={"flex-1 sm:flex-none min-w-[120px] sm:w-32 bg-red-600 text-slate-50 hover:bg-red-600/80 active:bg-red-500"} isHTPOpen={[htpOpen, setHTPOpen]} htpToPlay={htpToPlay} />

									</div>
								</div>

								<div className="max-w-[75%] md:max-w-[576px] lg:max-w-[900px] 2xl:max-w-[900px] px-6 mx-auto">
								<Accordion className="2xl:text-lg text-base text-slate-300 space-y-4 pt-8 border-solid border-t border-slate-50 font-extralight" type="single" collapsible>
									<AccordionItem className="border-slate-400" value="item-2">
										<AccordionTrigger><span className="text-lg sm:text-xl 2xl:text-2xl">Your mission:</span></AccordionTrigger>
										<AccordionContent>
											<div className="2xl:text-lg text-slate-300 space-y-4 py-8 border-solid border-t border-slate-400 font-extralight">
												<p>
													HQ is sending out the new callsigns for this week and this time you and your team are worried. You just found out that one of your agents is still alive but they're too far behind enemy lines to reach. You and your team will need to somehow send them their <span className="font-semibold underline">callsign</span> so they can authenticate with HQ before it’s too late! 
												</p>
												<p>
													It's far too risky to send the callsign itself out on the airwaves, if it gets intercepted, the whole team could be in danger! To stay under the radar, you and your team will need to send just <span className="font-semibold underline">one-word hints</span> out to your agent and hope that they will be able to figure out their callsign using just those hints before it’s too late. But be careful, the enemy is always listening! <span className="font-semibold underline">There can’t be any duplicate hints</span> or else the agency’s secret channels could be exposed! 
												</p>
												<p>
													Will your agent be able to figure out their callsign before it's too late or will they be captured before they get the chance?
												</p>
											</div>
										</AccordionContent>
									</AccordionItem>
								</Accordion>
								</div>
								

							</div>

						</div>

					</div>

				</div>

			</div>
			
		</div>

	);
}

export default Home;